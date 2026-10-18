import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { VerifiedPharmacyIdentity } from "./adapter";

type TokenKind = "challenge" | "session";
type TokenPayload = { kind: TokenKind; identity: VerifiedPharmacyIdentity; expiresAt: number };

// ponytail: encrypted stateless POC tokens survive Vercel instance changes; durable revocation can come later.
function tokenKey() {
  return createHash("sha256")
    .update(process.env.PHARMACY_ASSERTION_PRIVATE_JWK ?? "pharmacy-poc-session-key")
    .digest();
}

function isIdentity(value: unknown): value is VerifiedPharmacyIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<VerifiedPharmacyIdentity>;
  return identity.provider === "pharmacy-council"
    && typeof identity.subject === "string"
    && typeof identity.pharmacistLicense === "string"
    && typeof identity.firstName === "string"
    && typeof identity.lastName === "string"
    && (identity.email === null || typeof identity.email === "string")
    && (identity.phone === null || typeof identity.phone === "string");
}

function createToken(kind: TokenKind, identity: VerifiedPharmacyIdentity, ttlSeconds: number) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const payload: TokenPayload = { kind, identity, expiresAt: Date.now() + ttlSeconds * 1000 };
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}

function readToken(token: string, kind: TokenKind) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [iv, encrypted, authTag] = parts;
    if (!iv || !encrypted || !authTag) return null;
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(authTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]);
    const payload = JSON.parse(plaintext.toString("utf8")) as Partial<TokenPayload>;
    return payload.kind === kind
      && typeof payload.expiresAt === "number"
      && payload.expiresAt > Date.now()
      && isIdentity(payload.identity)
      ? payload.identity
      : null;
  } catch {
    return null;
  }
}

export const createChallenge = (identity: VerifiedPharmacyIdentity) => createToken("challenge", identity, 5 * 60);

export const consumeChallenge = (id: string) => readToken(id, "challenge");

export const createSession = (identity: VerifiedPharmacyIdentity, ttlSeconds: number) => createToken("session", identity, ttlSeconds);

export const getSession = (id: string) => readToken(id, "session");
