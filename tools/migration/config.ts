import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MigrationConfig } from "./types";

function redact(value: string) {
  return value.replace(/:[^:@/]+@/g, ":***@");
}

function requiredString(record: Record<string, unknown>, key: keyof MigrationConfig): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`migration config missing ${key}`);
  return value.trim();
}

export function getMigrationConfig(file: string): MigrationConfig {
  if (!file) throw new Error("migration config file is required");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolve(file), "utf8"));
  } catch {
    throw new Error(`migration config unreadable: ${file}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("migration config must be an object");
  const record = parsed as Record<string, unknown>;
  const config: MigrationConfig = {
    sourceDb: requiredString(record, "sourceDb"),
    targetDb: requiredString(record, "targetDb"),
    sourceStorage: requiredString(record, "sourceStorage"),
    targetStorage: requiredString(record, "targetStorage"),
    artifactDir: requiredString(record, "artifactDir"),
    expectedTargetProjectRef: requiredString(record, "expectedTargetProjectRef"),
  };
  if (config.sourceDb === config.targetDb)
    throw new Error("source and target databases must differ");
  try {
    const source = new URL(config.sourceDb);
    const target = new URL(config.targetDb);
    if (source.host === target.host && source.pathname === target.pathname)
      throw new Error("source and target databases must differ");
  } catch (error) {
    if (error instanceof Error && error.message.includes("must differ")) throw error;
    throw new Error(`invalid database URL in migration config (${redact(config.sourceDb)})`);
  }
  return config;
}

export function configPathFromEnv() {
  const file = process.env.MIGRATION_CONFIG_FILE;
  if (!file) throw new Error("MIGRATION_CONFIG_FILE is required");
  return file;
}
