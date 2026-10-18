import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { inventorySource } from "../inventory";
import { restoreBusinessData } from "../restore";
import { migrationFixture } from "./fixtures";

test("restore copies business rows and leaves users empty", async () => {
  const fixture = await migrationFixture();
  try {
    const manifest = await inventorySource(fixture.config);
    const report = await restoreBusinessData(fixture.config, manifest, []);
    const pool = new Pool({ connectionString: fixture.config.targetDb });
    try {
      const users = await pool.query("SELECT to_regclass('public.users') AS name");
      const userCount = users.rows[0]?.name
        ? Number((await pool.query("SELECT COUNT(*)::int AS n FROM users")).rows[0]?.n ?? 0)
        : 0;
      assert.equal(userCount, 0);
      assert.equal((await pool.query("SELECT license_no FROM pharmacists")).rows[0]?.license_no, "00000");
      assert.equal(report.recreatedRoles.includes("zero_grant_role"), true);
      assert.deepEqual(
        (await pool.query("SELECT id FROM news ORDER BY id")).rows.map((row: { id: number }) => row.id),
        [1],
      );
    } finally {
      await pool.end();
    }
  } finally {
    await fixture.cleanup();
  }
});
