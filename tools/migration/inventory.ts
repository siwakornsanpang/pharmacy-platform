import { createHash, randomUUID } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import {
  allowedExtraColumns,
  approvedColumns,
  excludedRowTables,
  excludedSequences,
  isManagedSchema,
  staffRefColumns,
} from "./ownership";
import type { FakeStorage, MigrationConfig, MigrationManifest } from "./types";

const storages = new Map<string, FakeStorage>();

export function registerFakeStorage(id: string, storage: FakeStorage) {
  storages.set(id, storage);
}

export function getFakeStorage(id: string) {
  return storages.get(id);
}

function guardLocalTestDb(value: string) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    || !/^\/pharmacy_test_[a-z0-9_]+$/.test(url.pathname)
    || url.search || url.hash) {
    throw new Error("Only disposable local pharmacy_test_* databases are allowed");
  }
}

function assertArtifactOutsideGit(artifactDir: string) {
  const resolved = resolve(artifactDir);
  const repo = resolve(process.cwd());
  if (!resolved.startsWith(repo)) return;
  const rel = resolved.slice(repo.length).replace(/\\/g, "/");
  if (rel.startsWith("/.migration-artifacts/") || rel === "/.migration-artifacts") return;
  throw new Error("artifact directory must not be tracked in Git");
}

export function assertMigrationSafety(config: MigrationConfig, manifest: MigrationManifest) {
  assertArtifactOutsideGit(config.artifactDir);
  if (existsSync(config.artifactDir) && !statSync(config.artifactDir).isDirectory())
    throw new Error("artifact path is not a directory");
  if (manifest.exceptions.length > 0)
    throw new Error(`migration blocked: ${manifest.exceptions.join("; ")}`);
  if (manifest.tables.some((table) => isManagedSchema(table.schema)))
    throw new Error("unknown managed schema");
}

export async function inventorySource(config: MigrationConfig): Promise<MigrationManifest> {
  guardLocalTestDb(config.sourceDb);
  guardLocalTestDb(config.targetDb);
  const source = new URL(config.sourceDb);
  const target = new URL(config.targetDb);
  if (config.sourceDb === config.targetDb || (source.host === target.host && source.pathname === target.pathname))
    throw new Error("source and target databases must differ");
  assertArtifactOutsideGit(config.artifactDir);
  const pool = new Pool({ connectionString: config.sourceDb });
  const exceptions: string[] = [];
  try {
    await pool.query("SET default_transaction_read_only = on");
    const schemas = await pool.query<{ schema_name: string }>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')",
    );
    for (const schema of schemas.rows) {
      if (schema.schema_name === "public" || isManagedSchema(schema.schema_name)) continue;
      exceptions.push(`unknown managed schema:${schema.schema_name}`);
    }

    const columns = await pool.query<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
    );
    const byTable = new Map<string, string[]>();
    for (const row of columns.rows) {
      const list = byTable.get(row.table_name) ?? [];
      list.push(row.column_name);
      byTable.set(row.table_name, list);
    }

    const tables: MigrationManifest["tables"] = [];
    for (const [name, tableColumns] of byTable) {
      if (tableColumns.includes("password_hash") && name === "users") {
        /* users rows stay excluded; column list omits the hash */
      }
      const approved = approvedColumns[name];
      if (approved) {
        const extras = tableColumns.filter((column) => {
          if (column === "password_hash") return false;
          return !approved.includes(column) && !(allowedExtraColumns[name] ?? []).includes(column);
        });
        if (extras.length) exceptions.push(`live extra column:${name}.${extras.join(",")}`);
      }
      const visibleColumns = tableColumns.filter((column) => column !== "password_hash");
      const count = excludedRowTables.includes(name as (typeof excludedRowTables)[number])
        ? 0
        : Number((await pool.query(`SELECT COUNT(*)::int AS n FROM ${quoteIdent(name)}`)).rows[0]?.n ?? 0);
      tables.push({ schema: "public", name, columns: visibleColumns, rowCount: count });
    }

    for (const [table, refs] of Object.entries(staffRefColumns)) {
      if (!byTable.has(table)) continue;
      for (const column of refs) {
        if (!byTable.get(table)!.includes(column)) continue;
        const dangling = await pool.query(
          `SELECT COUNT(*)::int AS n FROM ${quoteIdent(table)} WHERE ${quoteIdent(column)} IS NOT NULL`,
        );
        if (Number(dangling.rows[0]?.n ?? 0) > 0)
          exceptions.push(`unhandled staff ref:${table}.${column}`);
      }
    }

    const roles = await pool.query<{ role: string }>(
      byTable.has("roles")
        ? "SELECT name AS role FROM roles UNION SELECT role FROM users UNION SELECT role FROM role_permissions"
        : "SELECT DISTINCT role FROM users",
    );

    const sequences: MigrationManifest["sequences"] = [];
    const seqRows = await pool.query<{ sequencename: string }>(
      "SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'",
    );
    for (const sequence of seqRows.rows) {
      if (excludedSequences.includes(sequence.sequencename as (typeof excludedSequences)[number])) continue;
      const state = await pool.query<{ last_value: string; is_called: boolean }>(
        `SELECT last_value::text, is_called FROM ${quoteIdent(sequence.sequencename)}`,
      );
      sequences.push({
        name: sequence.sequencename,
        lastValue: state.rows[0]?.last_value ?? "0",
        isCalled: Boolean(state.rows[0]?.is_called),
      });
    }

    const licenses = byTable.has("pharmacists") && (byTable.get("pharmacists") ?? []).includes("license_no")
      ? (await pool.query<{ license_no: string }>("SELECT license_no FROM pharmacists ORDER BY id")).rows.map((row) => row.license_no)
      : [];

    const objects = storages.get(config.sourceStorage)?.list() ?? [];
    const snapshotId = createHash("sha256")
      .update(JSON.stringify({ tables, roles: roles.rows, sequences, objects, licenses }))
      .digest("hex");

    const manifest: MigrationManifest = {
      version: 1,
      snapshotId,
      tables,
      roles: [...new Set(roles.rows.map((row) => row.role))].sort(),
      sequences,
      objects,
      assetReferences: objects.flatMap((object) => object.ownerRefs),
      exceptions,
      licenses,
    };
    if (JSON.stringify(manifest).includes("password_hash"))
      throw new Error("inventory leaked password_hash");
    return manifest;
  } finally {
    await pool.end();
  }
}

function quoteIdent(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("invalid identifier");
  return `"${value}"`;
}

export function emptyManifest(): MigrationManifest {
  return {
    version: 1,
    snapshotId: randomUUID(),
    tables: [],
    roles: [],
    sequences: [],
    objects: [],
    assetReferences: [],
    exceptions: [],
    licenses: [],
  };
}
