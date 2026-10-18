import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { applyDatabasePolicy } from "./database-policy";
import { migrationFixture } from "../migration/tests/fixtures";

test("database policy denies anon, allows backend DML, denies backend DDL, and skips managed schemas", async () => {
  const fixture = await migrationFixture();
  const target = new Pool({ connectionString: fixture.config.targetDb });
  try {
    await target.query("CREATE TABLE news (id int PRIMARY KEY, title text NOT NULL)");
    await target.query("CREATE SCHEMA IF NOT EXISTS auth");
    await target.query("CREATE TABLE auth.users (id int)");
    await applyDatabasePolicy(fixture.config);
    await applyDatabasePolicy(fixture.config);

    await target.query("SET SESSION AUTHORIZATION pharmacy_backend");
    await target.query("SET search_path TO public");
    await target.query("INSERT INTO public.news(id,title) VALUES (1,'ok')");
    assert.equal((await target.query("SELECT title FROM public.news")).rows[0]?.title, "ok");
    await assert.rejects(() => target.query("ALTER TABLE public.news ADD COLUMN extra text"), /permission denied|must be owner|does not exist/);
    await target.query("RESET SESSION AUTHORIZATION");

    await target.query("SET SESSION AUTHORIZATION anon");
    await target.query("SET search_path TO public");
    await assert.rejects(() => target.query("SELECT * FROM public.news"), /permission denied|does not exist/);
    await target.query("RESET SESSION AUTHORIZATION");

    const auth = await target.query("SELECT has_schema_privilege('pharmacy_backend', 'auth', 'USAGE') AS ok");
    assert.equal(auth.rows[0]?.ok, false);
  } finally {
    await target.end();
    await fixture.cleanup();
  }
});
