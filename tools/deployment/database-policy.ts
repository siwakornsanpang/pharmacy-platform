import { Pool } from "pg";
import { managedSchemas } from "../migration/ownership";
import type { MigrationConfig } from "../migration/types";

const backend = "pharmacy_backend";
const migration = "pharmacy_migration";

export async function applyDatabasePolicy(config: MigrationConfig): Promise<void> {
  const pool = new Pool({ connectionString: config.targetDb });
  try {
  await pool.query(`DO $$ BEGIN CREATE ROLE ${backend} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await pool.query(`DO $$ BEGIN CREATE ROLE ${migration} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await pool.query(`DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await pool.query(`DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await pool.query("REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated");
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${backend}`);
  await pool.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${migration}`);
  const tables = await pool.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  for (const table of tables.rows) {
    const name = quote(table.tablename);
    await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${name} TO ${backend}`);
    await pool.query(`GRANT ALL ON TABLE ${name} TO ${migration}`);
    await pool.query(`REVOKE ALL ON TABLE ${name} FROM PUBLIC, anon, authenticated`);
    await pool.query(`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY`);
    await pool.query(`DROP POLICY IF EXISTS pharmacy_backend_all ON ${name}`);
    await pool.query(`CREATE POLICY pharmacy_backend_all ON ${name} FOR ALL TO ${backend} USING (true) WITH CHECK (true)`);
  }
  const sequences = await pool.query<{ sequencename: string }>(
    "SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'",
  );
  for (const sequence of sequences.rows) {
    await pool.query(`GRANT USAGE, SELECT ON SEQUENCE ${quote(sequence.sequencename)} TO ${backend}`);
    await pool.query(`GRANT ALL ON SEQUENCE ${quote(sequence.sequencename)} TO ${migration}`);
  }
  const schemas = await pool.query<{ schema_name: string }>(
    "SELECT schema_name FROM information_schema.schemata",
  );
  for (const schema of schemas.rows) {
    if (!(managedSchemas as readonly string[]).includes(schema.schema_name)) continue;
    await pool.query(`REVOKE ALL ON SCHEMA ${quote(schema.schema_name)} FROM ${backend}`);
  }
  } finally {
    await pool.end();
  }
}

function quote(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("invalid identifier");
  return `"${value}"`;
}
