import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { getDeploymentConfig } from "./config";
import { validateDeployment } from "./preflight";

const valid = {
  githubRepository: "owner/pharmacy-platform",
  vercelPharmacyProject: "pharmacy-web",
  vercelBackofficeProject: "pharmacy-office",
  renderService: "pharmacy-backend",
  supabaseProjectRef: "abcdefghijklmnop",
  frontendOrigins: ["https://web.example.test", "https://office.example.test"],
  backendOrigin: "https://api.example.test",
  customDomains: [],
};

const env = {
  BACKEND_API_URL: "https://api.example.test",
  PUBLIC_UPLOAD_BASE_URL: "https://upload.example.test",
  JWT_SECRET: "x".repeat(32),
  ACADEMY_BRIDGE_KEY: "y".repeat(16),
  PHARMACY_WEB_ORIGIN: "https://web.example.test",
  BACKOFFICE_ORIGIN: "https://office.example.test",
  CONFERENCE_API_URL: "https://conference.example.test",
  CORS_ORIGINS: "https://web.example.test,https://office.example.test",
  STAFF_SESSION_TTL_SECONDS: "28800",
  PRIVATE_ASSET_TTL_SECONDS: "300",
};

test("preflight rejects unsafe release config without provider writes", () => {
  const file = resolve(tmpdir(), "deploy-config.json");
  writeFileSync(file, `${JSON.stringify(valid)}\n`);
  const config = getDeploymentConfig(file);
  assert.equal(validateDeployment(config, env).ready, true);

  assert.ok(validateDeployment(config, { ...env, BACKEND_API_URL: "https://pharmacy-api-6w5d.onrender.com" }).failures.includes("oldbackendfallback"));
  assert.ok(validateDeployment(config, { ...env, JWT_SECRET: undefined }).failures.some((item) => item.startsWith("partialenv")));
  assert.ok(validateDeployment({ ...config, vercelPharmacyProject: "pharmacy-office" }, env).failures.some((item) => item.includes("mismatch")));
  assert.ok(validateDeployment({ ...config, frontendOrigins: ["https://*.example.test"] }, env).failures.length > 0);
  assert.ok(validateDeployment(config, { ...env, PHARMACY_POC_MODE: "true" }).failures.includes("activePOCbypass"));
  assert.ok(validateDeployment(config, { ...env, NEXT_PUBLIC_CONFERENCE_JWK: '{"kty":"OKP","d":"secret"}' }).failures.includes("privateJWK"));
  assert.ok(validateDeployment(config, { ...env, STAFF_SESSION_TTL_SECONDS: "60" }).failures.includes("inconsistentTTL"));
  assert.ok(validateDeployment(config, { ...env, PUBLIC_UPLOAD_BASE_URL: "https://upload.example.test/path" }).failures.includes("invalidfixeduploadorigin"));
  assert.ok(validateDeployment(config, { ...env, CONTENT_REVALIDATION_SECRET: "nope" }).failures.includes("cachecallback"));
  const provider = validateDeployment(config, { ...env, DEPLOYMENT_PROVIDER_ERROR: "true" });
  assert.equal(provider.ready, false);
  assert.ok(provider.failures.includes("providerfailure"));
});
