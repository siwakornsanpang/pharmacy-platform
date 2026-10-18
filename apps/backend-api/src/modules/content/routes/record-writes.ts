import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CAPABILITY, type PermissionKey } from '@pharmacy/contracts/access';
import { contentBoolean, contentDate, contentInteger, contentText, isContentDate } from '@pharmacy/contracts/content';
import { UploadIntentMetadataSchema, type AssetId, type AssetKind, type AssetOwner } from '@pharmacy/contracts/media';
import { MediaError, parseOwner } from '../../media';
import type { ContentDependencies } from '../public';
import { ContentQueryError } from '../route-manifest';
import { claimDraftContentAssets, commitContentAssets, publicContentAssetUrl } from '../media';
import { createRichTextSanitizer, sanitizeContentRichFields } from '../rich-text';
import { mediaUnavailable, readDetailId } from './read-query';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const optionalString = { ...contentText, maxLength: 20000 };
const optionalUrl = { type: ['string', 'null'], maxLength: 2048 };
const assetIdSchema = { type: 'string', pattern: uuid.source };
const successData = {
  type: 'object', additionalProperties: false, required: ['success', 'data'],
  properties: { success: { const: true }, data: { type: 'object', additionalProperties: true } },
} as const;
const successLogo = {
  type: 'object', additionalProperties: false, required: ['success'],
  properties: { success: { const: true }, logoUrl: { type: ['string', 'null'] } },
} as const;
const successOnly = {
  type: 'object', additionalProperties: false, required: ['success'],
  properties: { success: { const: true }, message: { type: 'string' } },
} as const;
const notFound = {
  type: 'object', additionalProperties: false, required: ['message'],
  properties: { message: { type: 'string' } },
} as const;

type FieldType = 'string' | 'int' | 'bool' | 'date' | 'html';
interface FieldSpec { key: string; column: string; type: FieldType; required?: true }
interface FileSpec { key: string; assetKey: string; column: string; slot: string }
export interface RecordWriteSpec {
  family: string;
  table: string;
  capability: PermissionKey;
  kind: AssetKind;
  fields: readonly FieldSpec[];
  files: readonly FileSpec[];
  createdAt?: true;
  updatedAt?: true;
  singleton?: true;
}

export const councilWrite: RecordWriteSpec = {
  family: 'council', table: 'council_members', capability: CAPABILITY.MANAGE_ABOUT, kind: 'website-image',
  fields: [
    { key: 'prefix', column: 'prefix', type: 'string' },
    { key: 'name', column: 'name', type: 'string', required: true },
    { key: 'position', column: 'position', type: 'string', required: true },
    { key: 'type', column: 'type', type: 'string', required: true },
    { key: 'order', column: 'order', type: 'int', required: true },
    { key: 'background', column: 'background', type: 'string' },
  ],
  files: [
    { key: 'imageUrl', assetKey: 'imageAssetId', column: 'image_url', slot: 'image' },
    { key: 'originalImageUrl', assetKey: 'originalAssetId', column: 'original_image_url', slot: 'original' },
  ],
};
export const historyWrite: RecordWriteSpec = {
  family: 'history', table: 'council_history', capability: CAPABILITY.MANAGE_ABOUT, kind: 'website-image',
  fields: [
    { key: 'term', column: 'term', type: 'string', required: true },
    { key: 'startYear', column: 'start_year', type: 'string', required: true },
    { key: 'endYear', column: 'end_year', type: 'string', required: true },
    { key: 'presidentName', column: 'president_name', type: 'string', required: true },
    { key: 'secretaryName', column: 'secretary_name', type: 'string', required: true },
  ],
  files: [
    { key: 'presidentImage', assetKey: 'presidentAssetId', column: 'president_image', slot: 'president' },
    { key: 'originalPresidentImage', assetKey: 'originalPresidentAssetId', column: 'original_president_image', slot: 'original-president' },
    { key: 'secretaryImage', assetKey: 'secretaryAssetId', column: 'secretary_image', slot: 'secretary' },
    { key: 'originalSecretaryImage', assetKey: 'originalSecretaryAssetId', column: 'original_secretary_image', slot: 'original-secretary' },
  ],
  createdAt: true,
};
export const agencyWrite: RecordWriteSpec = {
  family: 'agencies', table: 'agencies', capability: CAPABILITY.MANAGE_AGENCY, kind: 'website-image',
  fields: [
    { key: 'name', column: 'name', type: 'string', required: true },
    { key: 'title', column: 'title', type: 'string' },
    { key: 'description', column: 'description', type: 'string' },
    { key: 'url', column: 'url', type: 'string', required: true },
    { key: 'category', column: 'category', type: 'string', required: true },
    { key: 'order', column: 'order', type: 'int', required: true },
  ],
  files: [
    { key: 'thumbnailUrl', assetKey: 'thumbnailAssetId', column: 'thumbnail_url', slot: 'thumbnail' },
    { key: 'originalThumbnailUrl', assetKey: 'originalThumbnailAssetId', column: 'original_thumbnail_url', slot: 'original-thumbnail' },
    { key: 'logoUrl', assetKey: 'logoAssetId', column: 'logo_url', slot: 'logo' },
    { key: 'iconUrl', assetKey: 'iconAssetId', column: 'icon_url', slot: 'icon' },
  ],
  createdAt: true,
};
export const lawWrite: RecordWriteSpec = {
  family: 'laws', table: 'laws', capability: CAPABILITY.MANAGE_LAW, kind: 'public-document',
  fields: [
    { key: 'title', column: 'title', type: 'string', required: true },
    { key: 'category', column: 'category', type: 'string', required: true },
    { key: 'year', column: 'year', type: 'int' },
    { key: 'announcedAt', column: 'announced_at', type: 'date' },
    { key: 'order', column: 'order', type: 'int' },
    { key: 'status', column: 'status', type: 'string' },
  ],
  files: [{ key: 'pdfUrl', assetKey: 'pdfAssetId', column: 'pdf_url', slot: 'pdf' }],
  createdAt: true,
};
export const honorWrite: RecordWriteSpec = {
  family: 'honor', table: 'honors', capability: CAPABILITY.MANAGE_ABOUT, kind: 'website-image',
  fields: [
    { key: 'awardId', column: 'award_id', type: 'int' },
    { key: 'order', column: 'order', type: 'int' },
    { key: 'prefix', column: 'prefix', type: 'string' },
    { key: 'name', column: 'name', type: 'string', required: true },
    { key: 'awardName', column: 'award_name', type: 'string' },
    { key: 'workName', column: 'work_name', type: 'string' },
    { key: 'awardDetail', column: 'award_detail', type: 'string' },
    { key: 'fullDetail', column: 'full_detail', type: 'html' },
    { key: 'videoUrl', column: 'video_url', type: 'string' },
  ],
  files: [
    { key: 'imageUrl', assetKey: 'imageAssetId', column: 'image_url', slot: 'image' },
    { key: 'originalImageUrl', assetKey: 'originalAssetId', column: 'original_image_url', slot: 'original' },
  ],
  createdAt: true,
};
export const serviceWrite: RecordWriteSpec = {
  family: 'services', table: 'services', capability: CAPABILITY.MANAGE_SERVICE, kind: 'website-image',
  fields: [
    { key: 'name', column: 'name', type: 'string', required: true },
    { key: 'shortName', column: 'short_name', type: 'string' },
    { key: 'description', column: 'description', type: 'string' },
    { key: 'linkUrl', column: 'link_url', type: 'string' },
    { key: 'order', column: 'order', type: 'int' },
    { key: 'isPopular', column: 'is_popular', type: 'bool' },
    { key: 'popularOrder', column: 'popular_order', type: 'int' },
  ],
  files: [{ key: 'iconUrl', assetKey: 'iconAssetId', column: 'icon_url', slot: 'icon' }],
  createdAt: true,
};
export const policyProjectWrite: RecordWriteSpec = {
  family: 'policy-projects', table: 'policy_projects', capability: CAPABILITY.MANAGE_ABOUT, kind: 'public-document',
  fields: [
    { key: 'categoryId', column: 'category_id', type: 'int', required: true },
    { key: 'name', column: 'name', type: 'string', required: true },
    { key: 'status', column: 'status', type: 'string' },
    { key: 'order', column: 'order', type: 'int' },
  ],
  files: [{ key: 'summaryPdfUrl', assetKey: 'summaryPdfAssetId', column: 'summary_pdf_url', slot: 'pdf' }],
  createdAt: true,
};
export const otherServiceItemWrite: RecordWriteSpec = {
  family: 'other-service-items', table: 'other_service_items', capability: CAPABILITY.MANAGE_OTHER_SERVICE, kind: 'public-document',
  fields: [
    { key: 'categoryId', column: 'category_id', type: 'int', required: true },
    { key: 'name', column: 'name', type: 'string', required: true },
    { key: 'status', column: 'status', type: 'string' },
    { key: 'order', column: 'order', type: 'int' },
  ],
  files: [{ key: 'pdfUrl', assetKey: 'pdfAssetId', column: 'pdf_url', slot: 'pdf' }],
  createdAt: true,
};
export const webSettingsWrite: RecordWriteSpec = {
  family: 'web-settings', table: 'web_settings', capability: CAPABILITY.MANAGE_WEB_SETTINGS, kind: 'website-image',
  fields: [
    { key: 'siteNameTh', column: 'site_name_th', type: 'string' },
    { key: 'siteNameEn', column: 'site_name_en', type: 'string' },
    { key: 'slogan', column: 'slogan', type: 'string' },
    { key: 'address', column: 'address', type: 'string' },
    { key: 'phone', column: 'phone', type: 'string' },
    { key: 'fax', column: 'fax', type: 'string' },
    { key: 'email', column: 'email', type: 'string' },
    { key: 'googleMapsUrl', column: 'google_maps_url', type: 'string' },
    { key: 'googleMapsEmbed', column: 'google_maps_embed', type: 'string' },
    { key: 'facebookUrl', column: 'facebook_url', type: 'string' },
    { key: 'lineId', column: 'line_id', type: 'string' },
    { key: 'youtubeUrl', column: 'youtube_url', type: 'string' },
  ],
  files: [{ key: 'logoPath', assetKey: 'logoAssetId', column: 'logo_path', slot: 'logo' }],
  createdAt: true, updatedAt: true, singleton: true,
};

function ident(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid identifier');
  return `"${value}"`;
}
function parseAssetId(value: unknown): AssetId {
  if (typeof value !== 'string' || !uuid.test(value)) throw new ContentQueryError('Invalid asset');
  return value;
}
function ownerFor(family: string, id: string, slot: string): AssetOwner {
  return parseOwner({ domain: 'content', type: family, id, slot });
}
function fieldSchema(type: FieldType) {
  if (type === 'int') return contentInteger;
  if (type === 'bool') return contentBoolean;
  if (type === 'date') return { anyOf: [contentDate, { type: 'null' }, { type: 'string', maxLength: 0 }] };
  return optionalString;
}
function coerce(field: FieldSpec, raw: unknown, sanitize: (html: string) => string): unknown {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (raw === '') return field.required && (field.type === 'string' || field.type === 'html') ? '' : null;
  if (field.type === 'int') {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) throw new ContentQueryError(`Invalid ${field.key}`);
    return raw;
  }
  if (field.type === 'bool') {
    if (typeof raw !== 'boolean') throw new ContentQueryError(`Invalid ${field.key}`);
    return raw;
  }
  if (field.type === 'date') {
    if (!isContentDate(raw)) throw new ContentQueryError(`Invalid ${field.key}`);
    return raw;
  }
  if (typeof raw !== 'string') throw new ContentQueryError(`Invalid ${field.key}`);
  return field.type === 'html' ? sanitize(raw) : raw;
}
async function commitOrThrow(input: Parameters<typeof commitContentAssets>[0]) {
  const result = await commitContentAssets(input);
  if (result.failedReferenceCommit || result.confirmFailure)
    throw new MediaError(503, 'Content media operations temporarily unavailable');
}

export async function purgeContentRecords(
  deps: ContentDependencies, family: string, ids: Array<number | string>,
) {
  if (!deps.media) throw new MediaError(503, 'Content media operations temporarily unavailable');
  for (const id of ids) {
    const ownerId = String(id);
    const refs = (await deps.db.query(
      `SELECT owner_slot, asset_id FROM content_asset_refs WHERE owner_type=$1 AND owner_id=$2`,
      [family, ownerId],
    )).rows;
    await deps.db.query(`DELETE FROM content_asset_refs WHERE owner_type=$1 AND owner_id=$2`, [family, ownerId]);
    const bySlot = new Map<string, AssetId[]>();
    for (const row of refs) {
      const slot = row.owner_slot as string;
      const list = bySlot.get(slot) ?? [];
      list.push(row.asset_id as AssetId);
      bySlot.set(slot, list);
    }
    for (const [slot, assetIds] of bySlot) {
      if (assetIds.length) await deps.media.release(ownerFor(family, ownerId, slot), assetIds);
    }
  }
}

export function registerJsonRecordWrites(app: FastifyInstance, deps: ContentDependencies, spec: RecordWriteSpec) {
  const guard = deps.access.requireCapability(spec.capability);
  const urls = [`/api/admin/content/${spec.family}`, `/api/${spec.family}`];
  const properties: Record<string, unknown> = {};
  for (const field of spec.fields) properties[field.key] = fieldSchema(field.type);
  for (const file of spec.files) {
    properties[file.key] = optionalUrl;
    properties[file.assetKey] = assetIdSchema;
  }
  const bodySchema = { type: 'object', additionalProperties: false, properties } as const;
  const createSchema = { ...bodySchema, required: spec.fields.filter(field => field.required).map(field => field.key) };

  if (!deps.media) {
    for (const url of urls) {
      app.route({ method: 'POST', url, onRequest: [guard, mediaUnavailable], handler: mediaUnavailable });
      if (!spec.singleton) app.route({ method: ['PUT', 'DELETE'], url: `${url}/:id`, onRequest: [guard, mediaUnavailable], handler: mediaUnavailable });
    }
    app.post(`/api/${spec.family}/upload-image`, { onRequest: [guard, mediaUnavailable] }, mediaUnavailable);
    return;
  }

  const sanitize = createRichTextSanitizer(deps.config?.contentImageSources ?? []);
  app.post(urls[0]!, { onRequest: guard, schema: { body: createSchema, response: { 200: spec.singleton ? successLogo : successData } } }, create);
  app.post(urls[1]!, { onRequest: guard, schema: { body: createSchema, response: { 200: spec.singleton ? successLogo : successData } } }, create);
  if (!spec.singleton) {
    for (const url of urls) {
      app.put(`${url}/:id`, { onRequest: guard, schema: { body: bodySchema, response: { 200: successData, 404: notFound } } }, update);
      app.delete(`${url}/:id`, { onRequest: guard, schema: { response: { 200: successOnly, 404: notFound } } }, remove);
    }
  }

  if (!deps.uploads) {
    app.post(`/api/${spec.family}/upload-image`, { onRequest: [guard, mediaUnavailable] }, mediaUnavailable);
  } else {
    const uploads = deps.uploads;
    app.post(`/api/${spec.family}/upload-image`, {
      onRequest: guard,
      schema: { body: UploadIntentMetadataSchema, response: { 200: { type: 'object', additionalProperties: true } } },
    }, async request => {
      const actor = request.staffActor;
      if (!actor) throw new MediaError(401, 'Unauthorized');
      return uploads.createUploadIntent({
        verifiedActor: {
          kind: 'staff', actorKey: `staff:${actor.id}`, userId: actor.id, sessionId: actor.sessionId,
          requiredCapability: spec.capability,
        },
        owner: ownerFor(spec.family, `staff:${actor.id}`, 'draft'),
        kind: spec.kind,
        metadata: request.body as { filename: string; declaredMime: string; size: number },
      });
    });
  }

  function assetUrl(assetId: AssetId) {
    return publicContentAssetUrl({
      supabaseUrl: deps.config?.supabaseUrl, contentImageSources: deps.config?.contentImageSources, assetId,
    });
  }

  async function attachFiles(request: FastifyRequest, entityId: string, body: Record<string, unknown>) {
    const actor = request.staffActor;
    if (!actor) throw new MediaError(401, 'Unauthorized');
    for (const file of spec.files) {
      if (body[file.assetKey] === undefined) continue;
      const attach = [parseAssetId(body[file.assetKey])];
      await claimDraftContentAssets({
        db: deps.db, family: spec.family, staffId: actor.id, entityId, slot: file.slot, assetIds: attach,
      });
      const previous = (await deps.db.query(
        `SELECT asset_id FROM content_asset_refs WHERE owner_type=$1 AND owner_id=$2 AND owner_slot=$3`,
        [spec.family, entityId, file.slot],
      )).rows.map(row => row.asset_id as string);
      await commitOrThrow({
        db: deps.db, media: deps.media!, owner: ownerFor(spec.family, entityId, file.slot),
        attachAssetIds: attach, releaseAssetIds: previous.filter(id => !attach.includes(id)),
        write: async () => undefined,
      });
      const url = assetUrl(attach[0]!);
      if (url) await deps.db.query(`UPDATE ${ident(spec.table)} SET ${ident(file.column)}=$1 WHERE id=$2`, [url, entityId]);
    }
  }

  function assignments(body: Record<string, unknown>, creating: boolean, existing?: Record<string, unknown>) {
    const input = spec.family === 'honor' ? sanitizeContentRichFields('honor', { ...body }, sanitize) : body;
    const columns: string[] = [];
    const values: unknown[] = [];
    for (const field of spec.fields) {
      const raw = input[field.key];
      if (creating) {
        if (raw === undefined && field.required) throw new ContentQueryError(`Missing ${field.key}`);
        if (raw === undefined) continue;
      } else if (raw === undefined) continue;
      columns.push(field.column);
      values.push(coerce(field, raw, sanitize));
    }
    for (const file of spec.files) {
      if (input[file.key] === undefined && !(creating && input[file.assetKey])) continue;
      const persisted = typeof input[file.key] === 'string' && !String(input[file.key]).startsWith('blob:')
        ? input[file.key] : (existing?.[file.column] ?? null);
      columns.push(file.column);
      values.push(typeof persisted === 'string' ? persisted : persisted ?? null);
    }
    const now = deps.clock().toISOString();
    if (creating && spec.createdAt) { columns.push('created_at'); values.push(now); }
    if (spec.updatedAt) { columns.push('updated_at'); values.push(now); }
    return { columns, values };
  }

  async function create(request: FastifyRequest) {
    const body = request.body as Record<string, unknown>;
    if (spec.singleton) return upsertSettings(request, body);
    const row = assignments(body, true);
    const placeholders = row.columns.map((_, index) => `$${index + 1}`).join(',');
    const inserted = (await deps.db.query(
      `INSERT INTO ${ident(spec.table)}(${row.columns.map(ident).join(',')}) VALUES(${placeholders}) RETURNING id`,
      row.values,
    )).rows[0] as { id: number };
    await attachFiles(request, String(inserted.id), body);
    const data = (await deps.db.query(`SELECT * FROM ${ident(spec.table)} WHERE id=$1`, [inserted.id])).rows[0];
    return { success: true as const, data };
  }

  async function update(request: FastifyRequest, reply: FastifyReply) {
    const id = readDetailId(request);
    const existing = (await deps.db.query(`SELECT * FROM ${ident(spec.table)} WHERE id=$1`, [id])).rows[0];
    if (!existing) return reply.code(404).send({ message: 'Content not found' });
    const body = request.body as Record<string, unknown>;
    const row = assignments(body, false, existing);
    if (row.columns.length) {
      const set = row.columns.map((column, index) => `${ident(column)}=$${index + 1}`).join(',');
      await deps.db.query(`UPDATE ${ident(spec.table)} SET ${set} WHERE id=$${row.columns.length + 1}`, [...row.values, id]);
    }
    await attachFiles(request, String(id), body);
    const data = (await deps.db.query(`SELECT * FROM ${ident(spec.table)} WHERE id=$1`, [id])).rows[0];
    return { success: true as const, data };
  }

  async function remove(request: FastifyRequest, reply: FastifyReply) {
    const id = readDetailId(request);
    const existing = (await deps.db.query(`SELECT id FROM ${ident(spec.table)} WHERE id=$1`, [id])).rows[0];
    if (!existing) return reply.code(404).send({ message: 'Content not found' });
    await deps.db.query(`DELETE FROM ${ident(spec.table)} WHERE id=$1`, [id]);
    try { await purgeContentRecords(deps, spec.family, [id]); }
    catch { /* content row is gone; leftover media is reconciled later */ }
    return { success: true as const, message: 'Deleted' };
  }

  async function upsertSettings(request: FastifyRequest, body: Record<string, unknown>) {
    const current = (await deps.db.query(`SELECT * FROM web_settings ORDER BY id ASC LIMIT 1`)).rows[0];
    if (!current) {
      const row = assignments(body, true);
      const placeholders = row.columns.map((_, index) => `$${index + 1}`).join(',');
      const inserted = row.columns.length
        ? (await deps.db.query(
          `INSERT INTO web_settings(${row.columns.map(ident).join(',')}) VALUES(${placeholders}) RETURNING id, logo_path`,
          row.values,
        )).rows[0] as { id: number; logo_path: string | null }
        : (await deps.db.query(`INSERT INTO web_settings DEFAULT VALUES RETURNING id, logo_path`)).rows[0] as { id: number; logo_path: string | null };
      await attachFiles(request, String(inserted.id), body);
      const saved = (await deps.db.query(`SELECT logo_path FROM web_settings WHERE id=$1`, [inserted.id])).rows[0];
      return { success: true as const, logoUrl: saved?.logo_path ?? null };
    }
    const row = assignments(body, false, current);
    if (row.columns.length) {
      const set = row.columns.map((column, index) => `${ident(column)}=$${index + 1}`).join(',');
      await deps.db.query(`UPDATE web_settings SET ${set} WHERE id=$${row.columns.length + 1}`, [...row.values, current.id]);
    }
    await attachFiles(request, String(current.id as number), body);
    const saved = (await deps.db.query(`SELECT logo_path FROM web_settings WHERE id=$1`, [current.id])).rows[0];
    return { success: true as const, logoUrl: saved?.logo_path ?? null };
  }
}

export function registerCascadeDeletes(
  app: FastifyInstance, deps: ContentDependencies, spec: {
    family: string; table: string; capability: PermissionKey;
    childFamily: string; childTable: string; childColumn: string;
  },
) {
  const guard = deps.access.requireCapability(spec.capability);
  const urls = [`/api/admin/content/${spec.family}`, `/api/${spec.family}`];
  if (!deps.media) {
    for (const url of urls) app.delete(`${url}/:id`, { onRequest: [guard, mediaUnavailable] }, mediaUnavailable);
    return;
  }
  for (const url of urls) {
    app.delete(`${url}/:id`, { onRequest: guard, schema: { response: { 200: successOnly, 404: notFound } } }, async (request, reply) => {
      const id = readDetailId(request);
      const existing = (await deps.db.query(`SELECT id FROM ${ident(spec.table)} WHERE id=$1`, [id])).rows[0];
      if (!existing) return reply.code(404).send({ message: 'Content not found' });
      const children = (await deps.db.query(
        `SELECT id FROM ${ident(spec.childTable)} WHERE ${ident(spec.childColumn)}=$1`, [id],
      )).rows.map(row => row.id as number);
      await purgeContentRecords(deps, spec.childFamily, children);
      await deps.db.withTransaction(async tx => {
        await tx.query(`DELETE FROM ${ident(spec.childTable)} WHERE ${ident(spec.childColumn)}=$1`, [id]);
        await tx.query(`DELETE FROM ${ident(spec.table)} WHERE id=$1`, [id]);
      });
      return { success: true as const, message: 'Deleted' };
    });
  }
}
