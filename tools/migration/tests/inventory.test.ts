import assert from "node:assert/strict";
import test from "node:test";
import { getMigrationConfig } from "../config";
import { assertMigrationSafety, inventorySource } from "../inventory";
import { migrationFixture } from "./fixtures";

test("inventory keeps roles and leading-zero licenses without staff secrets", async () => {
  const fixture = await migrationFixture();
  try {
    const manifest = await inventorySource(fixture.config);
    assert.equal(manifest.roles.includes("zero_grant_role"), true);
    assert.equal(JSON.stringify(manifest).includes("password_hash"), false);
    assert.equal(JSON.stringify(manifest).includes("secret-hash-value"), false);
    assert.equal(manifest.licenses[0], "00000");
    assert.equal(typeof manifest.licenses[0], "string");
    assert.equal(Number(manifest.licenses[0]), 0);
    assert.notEqual(manifest.licenses[0], "0");
    const users = manifest.tables.find((table) => table.name === "users");
    assert.equal(users?.rowCount, 0);
    assert.equal(fixture.writes.length, 0);
    assertMigrationSafety(fixture.config, manifest);
  } finally {
    await fixture.cleanup();
  }
});

test("safety failures throw before writes", async () => {
  const same = await migrationFixture({ sameTarget: true });
  try {
    assert.throws(() => getMigrationConfig(same.configFile), /must differ/);
    await assert.rejects(() => inventorySource(same.config), /must differ/);
    assert.equal(same.writes.length, 0);
  } finally {
    await same.cleanup();
  }

  const git = await migrationFixture({ artifactInGit: true });
  try {
    await assert.rejects(() => inventorySource(git.config), /Git/);
    assert.equal(git.writes.length, 0);
  } finally {
    await git.cleanup();
  }

  const schema = await migrationFixture({ unknownSchema: true });
  try {
    const manifest = await inventorySource(schema.config);
    assert.throws(() => assertMigrationSafety(schema.config, manifest), /unknown managed schema/);
    assert.equal(schema.writes.length, 0);
  } finally {
    await schema.cleanup();
  }

  const staff = await migrationFixture({ createdBy: 1 });
  try {
    const manifest = await inventorySource(staff.config);
    assert.throws(() => assertMigrationSafety(staff.config, manifest), /staff ref/);
    assert.equal(staff.writes.length, 0);
  } finally {
    await staff.cleanup();
  }

  const extra = await migrationFixture({ extraColumn: true });
  try {
    const manifest = await inventorySource(extra.config);
    assert.throws(() => assertMigrationSafety(extra.config, manifest), /extra column/);
    assert.equal(extra.writes.length, 0);
  } finally {
    await extra.cleanup();
  }
});

test("missing config has no localhost fallback", async () => {
  const previous = process.env.MIGRATION_CONFIG_FILE;
  delete process.env.MIGRATION_CONFIG_FILE;
  try {
    assert.throws(() => getMigrationConfig(""), /required/);
  } finally {
    if (previous) process.env.MIGRATION_CONFIG_FILE = previous;
    else delete process.env.MIGRATION_CONFIG_FILE;
  }
});
