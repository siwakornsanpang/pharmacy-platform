import assert from "node:assert/strict";
import { Pool } from "pg";
import test from "node:test";
import { inventorySource } from "../inventory";
import { reconcileMigration } from "../reconcile";
import { restoreBusinessData } from "../restore";
import { copyObjects } from "../storage";
import { migrationFixture } from "./fixtures";

test("reconciliation passes only with matching bytes, empty users, and safe sequences", async () => {
  const fixture = await migrationFixture();
  try {
    const manifest = await inventorySource(fixture.config);
    await restoreBusinessData(fixture.config, manifest, []);
    const copied = await copyObjects(fixture.config, manifest);
    assert.equal(copied.passed, true);
    const ok = await reconcileMigration(fixture.config, manifest, []);
    assert.equal(ok.passed, true);
    assert.equal(ok.usersRows, 0);
    assert.equal(ok.objectMismatches.length, 0);

    const bytes = fixture.targetStorage.get("fixture/logo.png");
    if (!bytes) throw new Error("missing copied logo");
    bytes[0] = bytes[0] ^ 0xff;
    const mismatch = await reconcileMigration(fixture.config, manifest, []);
    assert.equal(mismatch.passed, false);
    assert.deepEqual(mismatch.objectMismatches, ["fixture/logo.png"]);
    bytes[0] = bytes[0] ^ 0xff;

    const target = new Pool({ connectionString: fixture.config.targetDb });
    try {
      await target.query("SELECT setval('pharmacists_id_seq', 1, false)");
      const badSeq = await reconcileMigration(fixture.config, manifest, []);
      assert.equal(badSeq.passed, false);
      assert.deepEqual(badSeq.sequenceErrors, ["pharmacists_id_seq"]);
    } finally {
      await target.end();
    }
  } finally {
    await fixture.cleanup();
  }
});
