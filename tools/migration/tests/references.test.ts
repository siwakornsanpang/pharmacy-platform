import assert from "node:assert/strict";
import test from "node:test";
import { inventorySource } from "../inventory";
import { buildReferencePlan, preserveExternalUrl } from "../references";
import { cutoverAllowed, restoreBusinessData } from "../restore";
import { migrationFixture } from "./fixtures";

test("internal storage refs rewrite once while external URLs and IDs stay", async () => {
  const internal = "https://abcd.supabase.co/storage/v1/object/public/news/cover.png";
  const external = "https://www.youtube.com/embed/uploads-fixture";
  const fixture = await migrationFixture();
  await fixture.source.query("UPDATE news SET title = $1", [`hero ${internal} and ${external}`]);
  try {
    const manifest = await inventorySource(fixture.config);
    manifest.assetReferences.push(internal, internal, external);
    const rewrites = buildReferencePlan(manifest);
    assert.equal(rewrites.length, 1);
    assert.equal(rewrites[0]?.oldValue, internal);
    assert.match(rewrites[0]?.newValue ?? "", /storage\.example\.test/);
    assert.equal(preserveExternalUrl(external), external);

    const report = await restoreBusinessData(fixture.config, manifest, rewrites);
    const target = (await import("pg")).Pool;
    const pool = new target({ connectionString: fixture.config.targetDb });
    try {
      const users = await pool.query("SELECT to_regclass('public.users') AS name");
      const userCount = users.rows[0]?.name
        ? Number((await pool.query("SELECT COUNT(*)::int AS n FROM users")).rows[0]?.n ?? 0)
        : 0;
      const roles = (await pool.query("SELECT name FROM roles")).rows.map((row: { name: string }) => row.name);
      const licenses = (await pool.query("SELECT license_no FROM pharmacists")).rows.map((row: { license_no: string }) => row.license_no);
      const ids = (await pool.query("SELECT id FROM pharmacists ORDER BY id")).rows.map((row: { id: number }) => row.id);
      const title = (await pool.query("SELECT title FROM news")).rows[0]?.title as string;
      assert.equal(userCount, 0);
      assert.equal(roles.includes("zero_grant_role"), true);
      assert.equal(licenses[0], "00000");
      assert.deepEqual(ids, [1]);
      assert.equal(title.includes(external), true);
      assert.equal(title.includes("storage.example.test"), true);
      assert.equal(title.includes("supabase.co"), false);
      assert.equal(cutoverAllowed(manifest.exceptions), true);
      assert.equal(report.importedTables.includes("pharmacists"), true);
    } finally {
      await pool.end();
    }
  } finally {
    await fixture.cleanup();
  }
});

test("exceptions block restore and cutover", async () => {
  const fixture = await migrationFixture({ createdBy: 1 });
  try {
    const manifest = await inventorySource(fixture.config);
    const report = await restoreBusinessData(fixture.config, manifest, []);
    assert.equal(report.importedTables.length, 0);
    assert.equal(cutoverAllowed(manifest.exceptions), false);
    assert.equal(cutoverAllowed(report.exceptions), false);
  } finally {
    await fixture.cleanup();
  }
});
