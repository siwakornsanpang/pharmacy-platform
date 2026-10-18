import Ajv from 'ajv';
import type { FastifySerializerCompiler } from 'fastify';
import {
  ContentBannerAdminSchema, ContentPopupSchema,
  type ContentBannerAdmin, type ContentPopup, type HomeContentAdminDetail, type PharmacistHomeContentAdminDetail,
} from '@pharmacy/contracts/content';
import type { Database, QueryClient } from '../../db/client';
import { jsonTimestamp } from './routes/read-query';

export type HomeFamily = 'home-content' | 'pharmacist-home-content';
export class ContentSingletonError extends Error {
  constructor(readonly statusCode: 400 | 409, message: string) { super(message); }
}
const validator = new Ajv({ strict: true, coerceTypes: false, removeAdditional: false });
const bannersSchema = { type: 'array', items: ContentBannerAdminSchema };
const popupsSchema = { type: 'array', items: ContentPopupSchema };
const validateBanners = validator.compile(bannersSchema);
const validatePopups = validator.compile(popupsSchema);
const validateHome = validator.compile({ type: 'object', additionalProperties: false, required: ['expectedRevision','banners','popups'], properties: {
  expectedRevision: { type: 'integer', minimum: 0, maximum: 2147483647 }, banners: bannersSchema, popups: popupsSchema,
} });
const validatePharmacist = validator.compile({ type: 'object', additionalProperties: false, required: ['expectedRevision','banners'], properties: {
  expectedRevision: { type: 'integer', minimum: 0, maximum: 2147483647 }, banners: bannersSchema,
} });
function table(family: HomeFamily) {
  if (family === 'home-content') return 'home_content';
  if (family === 'pharmacist-home-content') return 'pharmacist_home_content';
  throw new ContentSingletonError(400, 'Invalid home family');
}
function banner(value: unknown): ContentBannerAdmin {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unsupported stored banner shape');
  const row = value as ContentBannerAdmin;
  return { id: row.id, url: row.url, originalUrl: row.originalUrl, title: row.title, clickable: row.clickable, linkUrl: row.linkUrl, active: row.active, order: row.order };
}
function popup(value: unknown): ContentPopup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unsupported stored popup shape');
  const row = value as ContentPopup;
  return { id: row.id, url: row.url, title: row.title, active: row.active, order: row.order };
}
function collections(row: Record<string, unknown>, family: HomeFamily) {
  if (row.banners !== null && !Array.isArray(row.banners)) throw new Error('Unsupported stored banners');
  const banners = row.banners === null ? null : (row.banners as unknown[]).map(banner);
  if (banners !== null && !validateBanners(banners)) throw new Error('Unsupported stored banner fields');
  if (family === 'pharmacist-home-content') return { banners };
  if (row.popups !== null && !Array.isArray(row.popups)) throw new Error('Unsupported stored popups');
  const popups = row.popups === null ? null : (row.popups as unknown[]).map(popup);
  if (popups !== null && !validatePopups(popups)) throw new Error('Unsupported stored popup fields');
  return { banners, popups };
}
function detail(row: Record<string, unknown> | undefined, family: HomeFamily): HomeContentAdminDetail | PharmacistHomeContentAdminDetail {
  if (!row) return { id: null, revision: 0, banners: [], ...(family === 'home-content' ? { popups: [] } : {}), updatedAt: null };
  return { id: row.id as number, revision: row.revision as number, ...collections(row, family), updatedAt: jsonTimestamp(row.updated_at) };
}
async function canonical(tx: QueryClient, family: HomeFamily) {
  return (await tx.query(`SELECT id, revision, banners${family === 'home-content' ? ', popups' : ''}, updated_at AT TIME ZONE 'UTC' AS updated_at FROM ${table(family)} ORDER BY id ASC LIMIT 1`)).rows[0];
}
export async function readHomeContent(db: QueryClient, family: HomeFamily) {
  return detail(await canonical(db, family), family);
}

/** Content-only complete replacement. Task6 must validate Media identities before calling this service.
 * The two-key transaction advisory lock is scoped to this database + Content home family.
 * It serializes empty-set initialization and releases on commit/rollback; no external work runs here.
 */
export async function replaceHomeContent({ db, clock }: { db: Database; clock: () => Date }, family: HomeFamily, input: unknown) {
  const ownedTable = table(family);
  if (!(family === 'home-content' ? validateHome : validatePharmacist)(input)) throw new ContentSingletonError(400, 'Invalid complete home replacement');
  // Snapshot validated values before waiting on the transaction lock.
  const value = structuredClone(input) as { expectedRevision: number; banners: ContentBannerAdmin[]; popups?: ContentPopup[] };
  return db.withTransaction(async tx => {
    await tx.query('SELECT pg_advisory_xact_lock($1, $2)', [1129270868, family === 'home-content' ? 1 : 2]);
    const row = await canonical(tx, family);
    if (row ? value.expectedRevision === 0 || row.revision !== value.expectedRevision : value.expectedRevision !== 0) throw new ContentSingletonError(409, 'Content revision conflict');
    if (row) {
      try { collections(row, family); }
      catch { throw new ContentSingletonError(400, 'Unsupported stored home collections'); }
    }
    const updatedAt = clock().toISOString();
    const values: unknown[] = [JSON.stringify(value.banners), ...(family === 'home-content' ? [JSON.stringify(value.popups)] : []), updatedAt];
    const timestamp = `$${values.length}`;
    const fields = `banners${family === 'home-content' ? ', popups' : ''}, updated_at, revision`;
    const updated = row
      ? await tx.query(`UPDATE ${ownedTable} SET banners=$1${family === 'home-content' ? ', popups=$2' : ''}, updated_at=${timestamp}, revision=revision+1 WHERE id=$${values.length + 1} AND revision=$${values.length + 2} RETURNING id`, [...values, row.id, value.expectedRevision])
      : await tx.query(`INSERT INTO ${ownedTable} (${fields}) VALUES ($1${family === 'home-content' ? ', $2' : ''}, ${timestamp}, 1) RETURNING id`, values);
    if (!updated.rows.length) throw new ContentSingletonError(409, 'Content revision conflict');
    return detail(await canonical(tx, family), family);
  });
}

/** fast-json-stringify cannot merge the accepted nullable identity anyOf branches.
 * Validate the unchanged contract and serialize the explicit singleton projection instead.
 */
export const singletonSerializer: FastifySerializerCompiler<unknown> = ({ schema }) => {
  const validate = validator.compile(schema as object);
  return value => {
    if (!validate(value)) throw new Error('Invalid singleton projection');
    return JSON.stringify(value);
  };
};
