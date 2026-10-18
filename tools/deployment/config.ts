import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface DeploymentConfig {
  githubRepository: string;
  vercelPharmacyProject: string;
  vercelBackofficeProject: string;
  renderService: string;
  supabaseProjectRef: string;
  frontendOrigins: string[];
  backendOrigin: string;
  customDomains: string[];
}

function required(record: Record<string, unknown>, key: keyof DeploymentConfig): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`deployment config missing ${key}`);
  return value.trim();
}

function origins(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim()))
    throw new Error(`deployment config missing ${key}`);
  return value.map((item) => String(item).trim());
}

export function getDeploymentConfig(file: string): DeploymentConfig {
  if (!file) throw new Error("DEPLOYMENT_CONFIG_FILE is required");
  const parsed = JSON.parse(readFileSync(resolve(file), "utf8")) as Record<string, unknown>;
  return {
    githubRepository: required(parsed, "githubRepository"),
    vercelPharmacyProject: required(parsed, "vercelPharmacyProject"),
    vercelBackofficeProject: required(parsed, "vercelBackofficeProject"),
    renderService: required(parsed, "renderService"),
    supabaseProjectRef: required(parsed, "supabaseProjectRef"),
    frontendOrigins: origins(parsed.frontendOrigins, "frontendOrigins"),
    backendOrigin: required(parsed, "backendOrigin"),
    customDomains: origins(parsed.customDomains ?? [], "customDomains"),
  };
}
