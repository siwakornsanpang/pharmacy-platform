import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Pool } from "pg";
import { registerFakeStorage } from "../inventory";
import type { FakeStorage, MigrationConfig, ObjectManifest } from "../types";

export function guardTestDatabase(value: string): URL {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    || !/^\/pharmacy_test_[a-z0-9_]+$/.test(url.pathname)
    || url.search || url.hash) {
    throw new Error("Only disposable local pharmacy_test_* databases are allowed");
  }
  return url;
}

export function createFakeStorage(objects: ObjectManifest[] = []): FakeStorage {
  const writes: unknown[] = [];
  const bytes = new Map<string, Buffer>();
  const storage: FakeStorage = {
    objects,
    bytes,
    writes,
    duplicateWrites: 0,
    removed: [],
    maxObjectBytes: 50_000_000,
    capacityBytes: 1_000_000_000,
    list() {
      return objects;
    },
    get(path: string) {
      return bytes.get(path);
    },
    put(object, data) {
      const existing = bytes.get(object.path);
      if (existing && existing.equals(data)) {
        storage.duplicateWrites += 1;
        return;
      }
      if (existing && !existing.equals(data))
        throw new Error(`conflicting target bytes:${object.path}`);
      bytes.set(object.path, data);
      if (!objects.some((item) => item.path === object.path)) objects.push(object);
      writes.push(object.path);
    },
  };
  return storage;
}

export async function migrationFixture(options?: {
  extraColumn?: boolean;
  createdBy?: number | null;
  unknownSchema?: boolean;
  sameTarget?: boolean;
  artifactInGit?: boolean;
}) {
  const configured = process.env.TEST_DATABASE_URL
    ?? JSON.parse(readFileSync(resolve(__dirname, "../../../.superpowers/test-postgres/connection.json"), "utf8")).testDatabaseUrl as string;
  const adminUrl = guardTestDatabase(configured);
  const admin = new Pool({ connectionString: adminUrl.href });
  const sourceName = `pharmacy_test_mig_s_${process.pid}_${randomUUID().replaceAll("-", "")}`.slice(0, 63);
  const targetName = `pharmacy_test_mig_t_${process.pid}_${randomUUID().replaceAll("-", "")}`.slice(0, 63);
  await admin.query(`CREATE DATABASE "${sourceName}"`);
  await admin.query(`CREATE DATABASE "${targetName}"`);
  const sourceUrl = new URL(adminUrl.href); sourceUrl.pathname = `/${sourceName}`;
  const targetUrl = new URL(adminUrl.href); targetUrl.pathname = `/${targetName}`;
  guardTestDatabase(sourceUrl.href);
  guardTestDatabase(targetUrl.href);
  const source = new Pool({ connectionString: sourceUrl.href });
  await source.query(`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      username text NOT NULL,
      password_hash text NOT NULL,
      display_name text,
      role text NOT NULL,
      active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE roles (name text PRIMARY KEY);
    CREATE TABLE role_permissions (role text NOT NULL, permission_key text NOT NULL);
    CREATE TABLE pharmacists (
      id serial PRIMARY KEY,
      license_no text NOT NULL,
      prefix text,
      citizen_id text
    );
    CREATE TABLE news (
      id serial PRIMARY KEY,
      title text NOT NULL,
      created_by integer
    );
  `);
  await source.query("INSERT INTO roles(name) VALUES ('editor'), ('zero_grant_role')");
  await source.query("INSERT INTO users(username,password_hash,display_name,role) VALUES ('legacy','secret-hash-value','Legacy','zero_grant_role')");
  await source.query("INSERT INTO pharmacists(license_no,prefix,citizen_id) VALUES ('00000','ภก.','1234567890123')");
  if (options?.createdBy !== undefined)
    await source.query("INSERT INTO news(title,created_by) VALUES ('fixture', $1)", [options.createdBy]);
  else
    await source.query("INSERT INTO news(title) VALUES ('fixture')");
  if (options?.extraColumn)
    await source.query("ALTER TABLE news ADD COLUMN live_extra text");
  if (options?.unknownSchema)
    await source.query("CREATE SCHEMA unknown_managed; CREATE TABLE unknown_managed.x (id int)");

  const spill = resolve(tmpdir(), `pharmacy-mig-${randomUUID()}`);
  mkdirSync(spill, { recursive: true, mode: 0o700 });
  const artifactDir = options?.artifactInGit ? resolve(__dirname, "..") : spill;
  const logo = Buffer.from("logo");
  const storageId = `fake://${randomUUID()}`;
  const targetStorageId = `fake://target-${randomUUID()}`;
  const storage = createFakeStorage([{
    bucket: "public",
    path: "fixture/logo.png",
    size: logo.length,
    sha256: createHash("sha256").update(logo).digest("hex"),
    mime: "image/png",
    visibility: "public",
    ownerRefs: ["web_settings.logo"],
  }]);
  storage.bytes.set("fixture/logo.png", logo);
  const targetStorage = createFakeStorage([]);
  registerFakeStorage(storageId, storage);
  registerFakeStorage(targetStorageId, targetStorage);
  const config: MigrationConfig = {
    sourceDb: sourceUrl.href,
    targetDb: options?.sameTarget ? sourceUrl.href : targetUrl.href,
    sourceStorage: storageId,
    targetStorage: targetStorageId,
    artifactDir,
    expectedTargetProjectRef: "fixture-target",
  };
  const configFile = resolve(spill, "config.json");
  writeFileSync(configFile, `${JSON.stringify(config)}\n`, { mode: 0o600 });

  return {
    config,
    configFile,
    storage,
    targetStorage,
    writes: storage.writes,
    source,
    cleanup: async () => {
      await source.end();
      await admin.query(`DROP DATABASE "${sourceName}"`);
      await admin.query(`DROP DATABASE "${targetName}"`);
      await admin.end();
    },
  };
}
