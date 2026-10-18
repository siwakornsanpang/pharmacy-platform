import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { configPathFromEnv, getMigrationConfig } from "./config";
import { evaluateCutover } from "./cutover";
import { assertMigrationSafety, inventorySource } from "./inventory";
import { reconcileMigration } from "./reconcile";
import { buildReferencePlan } from "./references";
import { restoreBusinessData } from "./restore";
import { copyObjects } from "./storage";

async function main() {
  const command = process.argv[2] ?? "inventory";
  if (!["inventory", "plan", "copy", "apply", "verify"].includes(command))
    throw new Error("usage: tsx tools/migration/cli.ts <inventory|plan|copy|apply|verify>");
  const config = getMigrationConfig(configPathFromEnv());
  const manifest = await inventorySource(config);
  const dryRun = process.argv.includes("--apply") === false;
  const rewrites = buildReferencePlan(manifest);
  let extra: Record<string, unknown> = {};
  if (command === "plan") assertMigrationSafety(config, manifest);
  if (command === "copy" || command === "apply" || command === "verify") {
    if (dryRun) extra = { status: "dry-run", hint: "pass --apply and MIGRATION_APPLY=I_CONFIRM_TARGET" };
    else {
      if (process.env.MIGRATION_APPLY !== "I_CONFIRM_TARGET")
        throw new Error("apply is disabled until rehearsal confirmation");
      assertMigrationSafety(config, manifest);
      if (command === "apply") extra = { restore: await restoreBusinessData(config, manifest, rewrites) };
      if (command === "copy" || command === "apply") extra = { ...extra, copy: await copyObjects(config, manifest) };
      if (command === "verify") {
        const reconciliation = await reconcileMigration(config, manifest, rewrites);
        extra = {
          reconciliation: {
            passed: reconciliation.passed,
            tableCount: reconciliation.tableCount,
            objectCount: reconciliation.objectCount,
            usersRows: reconciliation.usersRows,
            mismatchCount: reconciliation.objectMismatches.length,
            idSetHash: reconciliation.idSetHash,
            dataHash: reconciliation.dataHash,
          },
          cutover: evaluateCutover({
            reconciliation,
            writersFrozen: process.env.MIGRATION_WRITERS_FROZEN === "true",
            newWrites: process.env.MIGRATION_NEW_WRITES === "true",
            compatibleReleaseAvailable: process.env.MIGRATION_COMPATIBLE_RELEASE === "true",
          }),
        };
      }
    }
  }
  const summary = {
    command,
    dryRun,
    status: manifest.exceptions.length ? "blocked" : "ok",
    snapshotId: manifest.snapshotId,
    tableCount: manifest.tables.length,
    roleCount: manifest.roles.length,
    objectCount: manifest.objects.length,
    exceptionCount: manifest.exceptions.length,
    excludedStaffTables: ["users", "pharmacist_logins", "staff_sessions"],
    ...extra,
  };
  mkdirSync(config.artifactDir, { mode: 0o700, recursive: true });
  writeFileSync(resolve(config.artifactDir, `${command}-summary.json`), `${JSON.stringify(summary)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "migration failed"}\n`);
  process.exit(1);
});
