// @vitest-environment node
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify, type JWK } from "jose";
import { describe, expect, it } from "vitest";
import { signConferenceAssertion } from "@/lib/server/conference-assertion";

const { d: _privatePart, ...publicKey } = JSON.parse(process.env.PHARMACY_ASSERTION_PRIVATE_JWK!) as JWK;
const jwks = { keys: [publicKey] };
const identity = { provider: "pharmacy-council" as const, subject: "user-42", pharmacistLicense: "ภ12345", firstName: "สมชาย", lastName: "รักชาติ", email: null, phone: null };

describe("Conference identity assertion", () => {
  it("uses EdDSA, stable provider subject and a short one-time lifetime", async () => {
    const first = await signConferenceAssertion(identity);
    const second = await signConferenceAssertion(identity);
    expect(decodeProtectedHeader(first)).toMatchObject({ alg: "EdDSA", kid: "pharmacy-web-test-ephemeral" });
    const { payload } = await jwtVerify(first, createLocalJWKSet(jwks), { issuer: "pharmacy-web", audience: "conference-api" });
    expect(payload).toMatchObject({ sub: "user-42", pharmacistLicense: "ภ12345", firstName: "สมชาย", lastName: "รักชาติ" });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(60);
    expect(first).not.toBe(second);
  });
});
