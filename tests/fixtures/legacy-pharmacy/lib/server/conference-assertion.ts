import { randomUUID } from "node:crypto";
import { importJWK, SignJWT, type JWK } from "jose";
import type { VerifiedPharmacyIdentity } from "./pharmacy-auth/adapter";

const DEV_PRIVATE_JWK: JWK = {
  crv: "Ed25519",
  d: "Cw9-xW-2zwJsFGqZJMi4KpAFOi-OTKN9AAG3V113GUs",
  x: "GMN4Qz0izhAUxD8gLgU0PPkb_iIC48-MwLFG3fUTG0Q",
  kty: "OKP",
  kid: "pharmacy-web-dev-1",
  use: "sig",
  alg: "EdDSA",
};

function config() {
  if (process.env.NODE_ENV === "production" && !process.env.PHARMACY_ASSERTION_PRIVATE_JWK) {
    throw new Error("PHARMACY_ASSERTION_PRIVATE_JWK is required in production");
  }
  const jwk = process.env.PHARMACY_ASSERTION_PRIVATE_JWK
    ? JSON.parse(process.env.PHARMACY_ASSERTION_PRIVATE_JWK) as JWK
    : DEV_PRIVATE_JWK;
  return {
    jwk,
    kid: process.env.PHARMACY_ASSERTION_KEY_ID ?? jwk.kid ?? "pharmacy-web-dev-1",
    issuer: process.env.PHARMACY_ASSERTION_ISSUER ?? "pharmacy-web",
    audience: process.env.PHARMACY_ASSERTION_AUDIENCE ?? "conference-api",
  };
}

export async function signConferenceAssertion(identity: VerifiedPharmacyIdentity) {
  const { jwk, kid, issuer, audience } = config();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    pharmacistLicense: identity.pharmacistLicense,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    phone: identity.phone,
  })
    .setProtectedHeader({ alg: "EdDSA", kid, typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(identity.subject)
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(await importJWK(jwk, "EdDSA"));
}
