import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { QueryClient } from './client';

// Delivery gate is media (0009). Academy 0010 stays out until that phase is in scope.
export const REQUIRED_SCHEMA_VERSION = '0009';
export const FINAL_RELEASE_SCHEMA_VERSION = '0010';
const OWNED_TABLES = [
  'users', 'permissions', 'role_permissions', 'roles', 'staff_sessions', 'access_audit',
  'media_assets', 'media_asset_pins', 'media_asset_references', 'media_cleanup_jobs', 'media_upload_intents',
  'content_asset_refs', 'content_media_intents', 'request_asset_refs', 'request_media_intents', 'request_operation_keys',
];

export interface ReadinessRequirement {
  version: string;
  tables: string[];
  migrationHashes: string[];
}

export function getReadinessRequirement(): ReadinessRequirement | null {
  const directory = resolve(__dirname, '../../drizzle');
  try {
    const journal: { entries: { idx: number; tag: string }[] } = JSON.parse(readFileSync(resolve(directory, 'meta/_journal.json'), 'utf8'));
    const entries = journal.entries.filter((entry) => entry.idx <= Number(REQUIRED_SCHEMA_VERSION));
    if (entries.length !== Number(REQUIRED_SCHEMA_VERSION) + 1) return null;
    const migrationHashes = entries.map((entry, index) => {
      if (entry.idx !== index || !new RegExp(`^${String(index).padStart(4, '0')}_[a-zA-Z0-9_]+$`).test(entry.tag)) throw new Error('Invalid migration journal');
      return createHash('sha256').update(readFileSync(resolve(directory, `${entry.tag}.sql`), 'utf8')).digest('hex');
    });
    return { version: REQUIRED_SCHEMA_VERSION, tables: OWNED_TABLES.map((table) => `public.${table}`), migrationHashes };
  } catch { return null; }
}

export async function checkDatabaseReadiness(db: QueryClient, requirement = getReadinessRequirement()): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    if (!requirement || !requirement.tables.length || !requirement.migrationHashes.length) return false;
    const result = await db.query(`SELECT
      NOT EXISTS (SELECT 1 FROM unnest($1::text[]) AS required(name) WHERE to_regclass(required.name) IS NULL)
      AND NOT EXISTS (SELECT 1 FROM unnest($2::text[]) AS required(hash)
        WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations AS applied WHERE applied.hash = required.hash)) AS ready`,
    [requirement.tables, requirement.migrationHashes]);
    return result.rows[0]?.ready === true;
  } catch { return false; }
}
