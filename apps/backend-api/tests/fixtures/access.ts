import { randomUUID } from 'node:crypto';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import bcrypt from 'bcryptjs';
import { createDatabase } from '../../src/db/client';
import { backendEnv } from './database';
import { getServerConfig } from '../../src/config/server';

export const migrationsDirectory = resolve(__dirname, '../../drizzle');
export const fixedNow = new Date('2026-10-15T12:00:00.789Z');
export const fakePassword = 'only-fake-fixture-password';

export function guardTestDatabase(value: string): URL {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !/^\/pharmacy_test_[a-z0-9_]+$/.test(url.pathname) || url.search || url.hash) throw new Error('Only disposable local pharmacy_test_* databases are allowed');
  return url;
}

export async function accessFixture(baselineOnly: boolean | 'access' | 'media' = false) {
  const configured = process.env.TEST_DATABASE_URL ?? JSON.parse(readFileSync(resolve(__dirname, '../../../../.superpowers/test-postgres/connection.json'), 'utf8')).testDatabaseUrl;
  const adminUrl = guardTestDatabase(configured);
  const admin = new Pool({ connectionString: adminUrl.href });
  const databaseName = `pharmacy_test_access_${process.pid}_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const url = new URL(adminUrl); url.pathname = `/${databaseName}`;
  guardTestDatabase(url.href);
  const migrationPool = new Pool({ connectionString: url.href });
  const db = createDatabase(url.href);
  const scratch = mkdtempSync(resolve(tmpdir(), 'pharmacy-access-'));
  const accessScratch = mkdtempSync(resolve(tmpdir(), 'pharmacy-access-0008-'));
  const mediaScratch = mkdtempSync(resolve(tmpdir(), 'pharmacy-access-0009-'));
  cpSync(migrationsDirectory, scratch, { recursive: true });
  cpSync(migrationsDirectory, accessScratch, { recursive: true });
  cpSync(migrationsDirectory, mediaScratch, { recursive: true });
  const fullJournal = JSON.parse(readFileSync(resolve(migrationsDirectory, 'meta/_journal.json'), 'utf8'));
  const through = baselineOnly === true ? 7 : baselineOnly === 'access' ? 8 : baselineOnly === 'media' ? 9 : Number.POSITIVE_INFINITY;
  const journal = { ...fullJournal, entries: fullJournal.entries.filter((entry: { idx: number }) => entry.idx <= through) };
  writeFileSync(resolve(scratch, 'meta/_journal.json'), JSON.stringify(journal));
  writeFileSync(resolve(accessScratch, 'meta/_journal.json'), JSON.stringify({
    ...fullJournal, entries: fullJournal.entries.filter((entry: { idx: number }) => entry.idx <= 8),
  }));
  writeFileSync(resolve(mediaScratch, 'meta/_journal.json'), JSON.stringify({
    ...fullJournal, entries: fullJournal.entries.filter((entry: { idx: number }) => entry.idx <= 9),
  }));
  const cleanup = async () => {
    await db.close(); await migrationPool.end();
    await admin.query(`DROP DATABASE "${databaseName}"`); await admin.end();
    rmSync(scratch, { recursive: true, force: true });
    rmSync(accessScratch, { recursive: true, force: true });
    rmSync(mediaScratch, { recursive: true, force: true });
  };
  try {
    await migrate(drizzle(migrationPool), { migrationsFolder: scratch });
    const migrateAccess = () => migrate(drizzle(migrationPool), { migrationsFolder: accessScratch });
    const migrateMedia = () => migrate(drizzle(migrationPool), { migrationsFolder: mediaScratch });
    const config = getServerConfig({ ...backendEnv, DATABASE_URL: url.href, STAFF_SESSION_TTL_SECONDS: '28800' });
    return { db, config, clock: () => fixedNow, cleanup, migrateAccess, migrateMedia };
  } catch (error) { await cleanup(); throw error; }
}

export async function seedStaff(db: ReturnType<typeof createDatabase>, role = 'editor') {
  const hasRoles = (await db.query("SELECT to_regclass('public.roles') AS name")).rows[0]?.name;
  if (hasRoles) await db.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT DO NOTHING', [role]);
  const id = (await db.query('INSERT INTO users(username,password_hash,display_name,role) VALUES($1,$2,$3,$4) RETURNING id',
    [`fake_${randomUUID()}`, await bcrypt.hash(fakePassword, 4), 'Fake Staff', role])).rows[0]!.id as number;
  const username = (await db.query('SELECT username FROM users WHERE id=$1', [id])).rows[0]!.username as string;
  await db.query("INSERT INTO permissions(key,label) VALUES ('manage_news','Fake news') ON CONFLICT DO NOTHING");
  if (hasRoles) await db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ($1,'manage_news',true),($1,'unknown_legacy',false)", [role]);
  else await db.query("INSERT INTO role_permissions(role,permission_key) VALUES ($1,'manage_news'),($1,'unknown_legacy')", [role]);
  return { id, username };
}
