import type {
  AdminPharmacist, PublicPharmacist, RegistryFilters, RegistryIdentity, RegistryPage, RegistryStats,
} from '@pharmacy/contracts/registry';
import type { Database } from '../../db/client';
import type { createAccessService } from '../access/service';
import { RegistryQueryError, registryClauses, type ParsedRegistryQuery } from './queries';

export interface RegistryDependencies {
  db: Database;
  access: Pick<ReturnType<typeof createAccessService>, 'requireCapability'>;
}
export interface RegistryPhotoAuthorization {
  ownerId: number;
  ownerExists: boolean;
  storedReference: string | null;
  authorized: boolean;
}
export interface RegistryPort {
  getPharmacistByLicense(license: string): Promise<RegistryIdentity | null>;
  getPhotoOwnerReference(ownerId: number, kind: 'website-image'): Promise<RegistryPhotoAuthorization>;
}

const publicFields = 'id, name, registration_id, province, status, expiry_date, image_url';
const adminFields = `${publicFields}, address`;
function publicRow(row: Record<string, unknown>): PublicPharmacist {
  return {
    id: row.id as number,
    name: row.name as string,
    registrationId: row.registration_id as string,
    province: row.province as string | null,
    status: row.status as string | null,
    expiryDate: row.expiry_date as string | null,
    imageUrl: row.image_url as string | null,
  };
}
function adminRow(row: Record<string, unknown>): AdminPharmacist {
  return { ...publicRow(row), address: row.address as string | null };
}
function total(row: Record<string, unknown> | undefined): number {
  const value = Number(row?.total);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid Registry count');
  return value;
}

export function createRegistryService(db: Database) {
  async function list<T extends PublicPharmacist>(
    query: ParsedRegistryQuery,
    admin: boolean,
  ): Promise<RegistryPage<T>> {
    const clauses = registryClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM pharmacists${clauses.where}`, clauses.values);
    const values = [...clauses.values, query.pageSize, query.offset];
    const rows = await db.query(
      `SELECT ${admin ? adminFields : publicFields} FROM pharmacists${clauses.where}${clauses.order} LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return {
      items: rows.rows.map(row => (admin ? adminRow(row) : publicRow(row)) as T),
      total: total(count.rows[0]),
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async function detail(id: number, admin: false): Promise<PublicPharmacist | null>;
  async function detail(id: number, admin: true): Promise<AdminPharmacist | null>;
  async function detail(id: number, admin: boolean): Promise<PublicPharmacist | AdminPharmacist | null> {
    const row = (await db.query(`SELECT ${admin ? adminFields : publicFields} FROM pharmacists WHERE id=$1`, [id])).rows[0];
    return row ? (admin ? adminRow(row) : publicRow(row)) : null;
  }
  const port: RegistryPort = {
    async getPharmacistByLicense(license) {
      if (typeof license !== 'string' || !license.length) return null;
      const row = (await db.query(
        'SELECT id, registration_id, name, status FROM pharmacists WHERE registration_id=$1',
        [license],
      )).rows[0];
      return row ? {
        id: row.id as number, license: row.registration_id as string,
        name: row.name as string, status: row.status as string | null,
      } : null;
    },
    async getPhotoOwnerReference(ownerId, kind) {
      if (!Number.isSafeInteger(ownerId) || ownerId <= 0 || ownerId > 2147483647) throw new RegistryQueryError('Invalid Registry owner id');
      if (kind !== 'website-image') throw new RegistryQueryError('Invalid Registry photo kind');
      const row = (await db.query('SELECT id, image_url FROM pharmacists WHERE id=$1', [ownerId])).rows[0];
      return row
        ? { ownerId, ownerExists: true, storedReference: row.image_url as string | null, authorized: true }
        : { ownerId, ownerExists: false, storedReference: null, authorized: false };
    },
  };
  return {
    listPublic: (query: ParsedRegistryQuery) => list<PublicPharmacist>(query, false),
    listAdmin: (query: ParsedRegistryQuery) => list<AdminPharmacist>(query, true),
    publicDetail: (id: number) => detail(id, false),
    adminDetail: (id: number) => detail(id, true),
    async stats(): Promise<RegistryStats> {
      return { total: total((await db.query('SELECT count(*) AS total FROM pharmacists')).rows[0]) };
    },
    async filters(): Promise<RegistryFilters> {
      const row = (await db.query(`SELECT
        ARRAY(SELECT DISTINCT btrim(province) FROM pharmacists WHERE province IS NOT NULL AND btrim(province)<>'' ORDER BY 1) AS provinces,
        ARRAY(SELECT DISTINCT btrim(status) FROM pharmacists WHERE status IS NOT NULL AND btrim(status)<>'' ORDER BY 1) AS statuses`)).rows[0];
      return { provinces: row?.provinces as string[] ?? [], statuses: row?.statuses as string[] ?? [] };
    },
    ...port,
  };
}
