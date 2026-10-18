import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getDeploymentConfig, type DeploymentConfig } from "./config";

export interface PreflightReport {
  ready: boolean;
  nodeMajor: number;
  failures: string[];
}

const oldBackends = ["pharmacy-api-6w5d.onrender.com", "onrender.com/api"];

function originOk(value: string, httpsOnly = false) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    if (url.hostname.includes("*")) return false;
    if (httpsOnly && url.protocol !== "https:") return false;
    if (url.hostname === "localhost" || url.hostname.startsWith("127.")) return false;
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateDeployment(
  config: DeploymentConfig,
  env: Record<string, string | undefined> = process.env,
): PreflightReport {
  const failures: string[] = [];
  if (!config.githubRepository.includes("/")) failures.push("githubRepository");
  if (config.vercelPharmacyProject === config.vercelBackofficeProject) failures.push("target-source mismatch: vercel projects");
  if (config.supabaseProjectRef.length < 8) failures.push("supabaseProjectRef");
  for (const origin of [...config.frontendOrigins, config.backendOrigin, ...config.customDomains]) {
    if (!originOk(origin, true)) failures.push(`origin:${origin}`);
  }
  if (config.frontendOrigins.some((origin) => origin.includes("*"))) failures.push("wildcardorigins");
  for (const banned of oldBackends) {
    if (config.backendOrigin.includes(banned) || (env.BACKEND_API_URL ?? "").includes(banned))
      failures.push("oldbackendfallback");
  }
  const required = [
    "BACKEND_API_URL", "PUBLIC_UPLOAD_BASE_URL", "JWT_SECRET", "ACADEMY_BRIDGE_KEY",
    "PHARMACY_WEB_ORIGIN", "BACKOFFICE_ORIGIN", "CONFERENCE_API_URL", "CORS_ORIGINS",
  ];
  for (const name of required) {
    if (!env[name]?.trim()) failures.push(`partialenv:${name}`);
  }
  if (env.CONTENT_REVALIDATION_SECRET || env.CACHE_CALLBACK_URL) failures.push("cachecallback");
  if (env.PHARMACY_POC_MODE === "true") failures.push("activePOCbypass");
  if (env.ALLOW_LOCAL_UI_BYPASS === "true") failures.push("activePOCbypass");
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && value && /BEGIN PRIVATE KEY|"kty"\s*:\s*"OKP"|private_jwk/i.test(value))
      failures.push("privateJWK");
  }
  const staffTtl = Number(env.STAFF_SESSION_TTL_SECONDS ?? "28800");
  const privateTtl = Number(env.PRIVATE_ASSET_TTL_SECONDS ?? "300");
  if (staffTtl !== 28800 || privateTtl !== 300) failures.push("inconsistentTTL");
  if (env.PUBLIC_UPLOAD_BASE_URL && !originOk(env.PUBLIC_UPLOAD_BASE_URL, true)) failures.push("invalidfixeduploadorigin");
  if (env.BACKEND_API_URL && !originOk(env.BACKEND_API_URL, true)) failures.push("invalidbackendorigin");
  if (existsSync(resolve(".env")) || existsSync(resolve("apps/pharmacy-web/.env"))) failures.push("trackedsecrets");
  if (env.DEPLOYMENT_PROVIDER_ERROR === "true") failures.push("providerfailure");
  return { ready: failures.length === 0, nodeMajor: 24, failures };
}

export async function main() {
  const file = process.env.DEPLOYMENT_CONFIG_FILE;
  if (!file) throw new Error("DEPLOYMENT_CONFIG_FILE is required");
  const report = validateDeployment(getDeploymentConfig(file));
  process.stdout.write(`${JSON.stringify({ ready: report.ready, nodeMajor: report.nodeMajor, failureCount: report.failures.length })}\n`);
  if (!report.ready) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("preflight.ts")) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "preflight failed"}\n`);
    process.exit(1);
  });
}
