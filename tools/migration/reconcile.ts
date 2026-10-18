import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getFakeStorage } from "./inventory";
import { hashBytes } from "./storage";
import type { MigrationConfig, MigrationManifest, ReconciliationReport, ReferenceRewrite } from "./types";

export async function reconcileMigration(
  config: MigrationConfig,
  manifest: MigrationManifest,
  _rewrites: ReferenceRewrite[] = [],
): Promise<ReconciliationReport> {
  const target = new Pool({ connectionString: config.targetDb });
  const sourceStorage = getFakeStorage(config.sourceStorage);
  const targetStorage = getFakeStorage(config.targetStorage);
  const objectMismatches: string[] = [];
  const sequenceErrors: string[] = [];
  try {
    for (const object of manifest.objects) {
      const sourceBytes = sourceStorage?.get(object.path);
      const targetBytes = targetStorage?.get(object.path);
      if (!sourceBytes || !targetBytes || hashBytes(targetBytes) !== object.sha256 || !sourceBytes.equals(targetBytes))
        objectMismatches.push(object.path);
    }
    const usersRel = await target.query("SELECT to_regclass('public.users') AS name");
    const usersRows = usersRel.rows[0]?.name
      ? Number((await target.query("SELECT COUNT(*)::int AS n FROM users")).rows[0]?.n ?? 0)
      : 0;
    const pharmacistsRel = await target.query("SELECT to_regclass('public.pharmacists') AS name");
    const ids = pharmacistsRel.rows[0]?.name
      ? (await target.query("SELECT id FROM pharmacists ORDER BY id")).rows.map((row: { id: number }) => row.id)
      : [];
    const licenses = pharmacistsRel.rows[0]?.name
      ? (await target.query("SELECT license_no FROM pharmacists ORDER BY id")).rows.map((row: { license_no: string }) => row.license_no)
      : [];
    if (pharmacistsRel.rows[0]?.name) {
      const seq = await target.query("SELECT to_regclass('public.pharmacists_id_seq') AS name");
      if (seq.rows[0]?.name) {
        const state = await target.query("SELECT last_value::text, is_called FROM pharmacists_id_seq");
        const last = Number(state.rows[0]?.last_value ?? 0);
        const maxId = ids.reduce((max, id) => Math.max(max, id), 0);
        const next = state.rows[0]?.is_called ? last + 1 : last;
        if (next <= maxId) sequenceErrors.push("pharmacists_id_seq");
      }
    }
    const idSetHash = createHash("sha256").update(JSON.stringify(ids)).digest("hex");
    const dataHash = createHash("sha256").update(JSON.stringify({ licenses, ids, objects: manifest.objects.map((o) => o.sha256) })).digest("hex");
    const passed = objectMismatches.length === 0
      && sequenceErrors.length === 0
      && manifest.exceptions.length === 0
      && usersRows === 0;
    return {
      passed,
      tableCount: manifest.tables.length,
      objectCount: manifest.objects.length,
      idSetHash,
      dataHash,
      objectMismatches,
      sequenceErrors,
      exceptions: manifest.exceptions,
      usersRows,
    };
  } finally {
    await target.end();
  }
}
