import "@testing-library/jest-dom/vitest";
import { generateKeyPairSync } from "node:crypto";

// Each test worker gets a fresh fixture; never use the legacy source signing key.
const { privateKey } = generateKeyPairSync("ed25519");
process.env.PHARMACY_ASSERTION_PRIVATE_JWK = JSON.stringify({
  ...privateKey.export({ format: "jwk" }),
  kid: "pharmacy-web-test-ephemeral",
  use: "sig",
  alg: "EdDSA",
});
process.env.PHARMACY_ASSERTION_KEY_ID = "pharmacy-web-test-ephemeral";
