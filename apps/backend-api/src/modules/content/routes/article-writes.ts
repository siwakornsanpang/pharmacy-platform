import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CAPABILITY, type PermissionKey } from '@pharmacy/contracts/access';
import { UploadIntentMetadataSchema, type AssetId, type AssetOwner } from '@pharmacy/contracts/media';
import { MediaError, parseOwner } from '../../media';
import type { ContentDependencies } from '../public';
import { ContentQueryError } from '../route-manifest';
import { claimDraftContentAssets, commitContentAssets, publicContentAssetUrl } from '../media';
import { createRichTextSanitizer, sanitizeContentRichFields } from '../rich-text';
import { mediaUnavailable, readDetailId } from './read-query';

export const jsonWriteFamilies = ['news', 'medicine', 'public-project', 'products'] as const;
export type JsonWriteFamily = typeof jsonWriteFamilies[number];

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tables: Record<JsonWriteFamily, string> = {
  news: 'news',
  medicine: 'medicine_articles',
  'public-project': 'public_project_articles',
  products: 'products',
};
const capabilities: Record<JsonWriteFamily, PermissionKey> = {
  news: CAPABILITY.MANAGE_NEWS,
  medicine: CAPABILITY.MANAGE_NEWS,
  'public-project': CAPABILITY.MANAGE_NEWS,
  products: CAPABILITY.MANAGE_PRODUCT,
};
const coverSlot: Record<JsonWriteFamily, 'cover' | 'image'> = {
  news: 'cover', medicine: 'cover', 'public-project': 'cover', products: 'image',
};
const articleString = { type: 'string', minLength: 1, maxLength: 20000 };
const optionalString = { type: ['string', 'null'], maxLength: 20000 };
const optionalUrl = { type: ['string', 'null'], maxLength: 2048 };
const assetIdSchema = { type: 'string', pattern: uuid.source };
const articleBody = {
  type: 'object', additionalProperties: false,
  properties: {
    title: articleString, content: { type: 'string', maxLength: 500000 }, excerpt: optionalString,
    category: { type: 'string', minLength: 1, maxLength: 100 },
    status: { type: 'string', enum: ['draft', 'published'] },
    publishedAt: { type: ['string', 'null'] }, isHighlight: { type: 'boolean' },
    thumbnailUrl: optionalUrl, thumbnailAssetId: assetIdSchema,
    bodyAssetIds: { type: 'array', items: assetIdSchema, maxItems: 100 },
  },
} as const;
const productBody = {
  type: 'object', additionalProperties: false,
  properties: {
    name: articleString, category: { type: 'string', minLength: 1, maxLength: 100 },
    description: optionalString, price: { type: 'string', pattern: '^-?\\d+(?:\\.\\d{1,2})?$' },
    imageUrl: optionalUrl, imageAssetId: assetIdSchema,
  },
} as const;
const successData = {
  type: 'object', additionalProperties: false, required: ['success', 'data'],
  properties: { success: { const: true }, data: { type: 'object', additionalProperties: true } },
} as const;
const successOnly = {
  type: 'object', additionalProperties: false, required: ['success'],
  properties: { success: { const: true }, message: { type: 'string' } },
} as const;
const notFound = {
  type: 'object', additionalProperties: false, required: ['message'],
  properties: { message: { type: 'string' } },
} as const;

function parseAssetId(value: unknown): AssetId {
  if (typeof value !== 'string' || !uuid.test(value)) throw new ContentQueryError('Invalid asset');
  return value;
}
function uniqueAssets(values: unknown): AssetId[] {
  if (values === undefined) return [];
  if (!Array.isArray(values) || values.length > 100) throw new ContentQueryError('Invalid asset');
  return [...new Set(values.map(parseAssetId))];
}
function ownerFor(family: JsonWriteFamily, id: string, slot: string): AssetOwner {
  return parseOwner({ domain: 'content', type: family, id, slot });
}
async function listedRefs(db: ContentDependencies['db'], family: JsonWriteFamily, id: string, slot: string) {
  return (await db.query(
    `SELECT asset_id FROM content_asset_refs WHERE owner_type=$1 AND owner_id=$2 AND owner_slot=$3`,
    [family, id, slot],
  )).rows.map(row => row.asset_id as string);
}
async function commitOrThrow(input: Parameters<typeof commitContentAssets>[0]) {
  const result = await commitContentAssets(input);
  if (result.failedReferenceCommit || result.confirmFailure)
    throw new MediaError(503, 'Content media operations temporarily unavailable');
}

function publishedAt(status: unknown, value: unknown, fallback: Date | null, clock: Date, creating = false) {
  if (typeof value === 'string') return new Date(value);
  if (value === null) return null;
  if (creating && status === 'published' && !fallback) return clock;
  return fallback;
}

export function registerJsonFamilyWrites(app: FastifyInstance, deps: ContentDependencies, family: JsonWriteFamily) {
  const guard = deps.access.requireCapability(capabilities[family]);
  const urls = [`/api/admin/content/${family}`, `/api/${family}`];
  if (!deps.media) {
    for (const url of urls) {
      app.route({ method: 'POST', url, onRequest: [guard, mediaUnavailable], handler: mediaUnavailable });
      app.route({ method: ['PUT', 'DELETE'], url: `${url}/:id`, onRequest: [guard, mediaUnavailable], handler: mediaUnavailable });
    }
    app.post(`/api/${family}/upload-image`, { onRequest: [guard, mediaUnavailable] }, mediaUnavailable);
    return;
  }
  const media = deps.media;
  const table = tables[family];
  const sanitize = createRichTextSanitizer(deps.config?.contentImageSources ?? []);
  const isProduct = family === 'products';
  const createSchema = isProduct
    ? { ...productBody, required: ['name', 'category', 'price'] }
    : { ...articleBody, required: ['title', 'content'] };

  app.post(urls[0]!, { onRequest: guard, schema: { body: createSchema, response: { 200: successData } } }, create);
  app.post(urls[1]!, { onRequest: guard, schema: { body: createSchema, response: { 200: successData } } }, create);
  for (const url of urls) {
    app.put(`${url}/:id`, {
      onRequest: guard,
      schema: { body: isProduct ? productBody : articleBody, response: { 200: successData, 404: notFound } },
    }, update);
    app.delete(`${url}/:id`, { onRequest: guard, schema: { response: { 200: successOnly, 404: notFound } } }, remove);
  }

  if (!deps.uploads) {
    app.post(`/api/${family}/upload-image`, { onRequest: [guard, mediaUnavailable] }, mediaUnavailable);
  } else {
    const uploads = deps.uploads;
    app.post(`/api/${family}/upload-image`, {
      onRequest: guard,
      schema: { body: UploadIntentMetadataSchema, response: { 200: { type: 'object', additionalProperties: true } } },
    }, async request => {
      const actor = request.staffActor;
      if (!actor) throw new MediaError(401, 'Unauthorized');
      return uploads.createUploadIntent({
        verifiedActor: {
          kind: 'staff', actorKey: `staff:${actor.id}`, userId: actor.id, sessionId: actor.sessionId,
          requiredCapability: capabilities[family],
        },
        owner: ownerFor(family, `staff:${actor.id}`, 'draft'),
        kind: 'website-image',
        metadata: request.body as { filename: string; declaredMime: string; size: number },
      });
    });
  }

  function coverUrl(assetId: AssetId) {
    return publicContentAssetUrl({
      supabaseUrl: deps.config?.supabaseUrl,
      contentImageSources: deps.config?.contentImageSources,
      assetId,
    });
  }

  async function persistCoverUrl(entityId: string, assetId: AssetId) {
    const url = coverUrl(assetId);
    if (!url) return;
    const column = isProduct ? 'image_url' : 'thumbnail_url';
    await deps.db.query(`UPDATE ${table} SET ${column}=$1 WHERE id=$2`, [url, entityId]);
  }

  async function attachJsonAssets(request: FastifyRequest, entityId: string, body: Record<string, unknown>) {
    const cover = coverSlot[family];
    const attachCover = body.thumbnailAssetId !== undefined || body.imageAssetId !== undefined
      ? [parseAssetId(body.thumbnailAssetId ?? body.imageAssetId)] : [];
    const attachBody = body.bodyAssetIds !== undefined ? uniqueAssets(body.bodyAssetIds) : [];
    if (!attachCover.length && body.bodyAssetIds === undefined) return;
    const actor = request.staffActor;
    if (!actor) throw new MediaError(401, 'Unauthorized');
    if (attachCover.length) {
      await claimDraftContentAssets({
        db: deps.db, family, staffId: actor.id, entityId, slot: cover, assetIds: attachCover,
      });
      const previousCover = await listedRefs(deps.db, family, entityId, cover);
      await commitOrThrow({
        db: deps.db, media, owner: ownerFor(family, entityId, cover),
        attachAssetIds: attachCover, releaseAssetIds: previousCover.filter(assetId => !attachCover.includes(assetId)),
        write: async () => undefined,
      });
      await persistCoverUrl(entityId, attachCover[0]!);
    }
    if (body.bodyAssetIds !== undefined) {
      await claimDraftContentAssets({
        db: deps.db, family, staffId: actor.id, entityId, slot: 'body', assetIds: attachBody,
      });
      const previousBody = await listedRefs(deps.db, family, entityId, 'body');
      await commitOrThrow({
        db: deps.db, media, owner: ownerFor(family, entityId, 'body'),
        attachAssetIds: attachBody, releaseAssetIds: previousBody.filter(assetId => !attachBody.includes(assetId)),
        write: async () => undefined,
      });
    }
  }

  async function create(request: FastifyRequest) {
    const body = request.body as Record<string, unknown>;
    const now = deps.clock();
    const row = isProduct ? productInsert(body, now) : articleInsert(family, body, now, sanitize);
    const inserted = (await deps.db.query(row.sql, row.values)).rows[0];
    const entityId = String((inserted as { id: unknown }).id);
    await attachJsonAssets(request, entityId, body);
    const data = (await deps.db.query(`SELECT * FROM ${table} WHERE id=$1`, [entityId])).rows[0];
    return { success: true as const, data };
  }

  async function update(request: FastifyRequest, reply: FastifyReply) {
    const id = readDetailId(request);
    const existing = (await deps.db.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0];
    if (!existing) return reply.code(404).send({ message: 'Content not found' });
    const body = request.body as Record<string, unknown>;
    const now = deps.clock();
    const patch = isProduct ? productUpdate(existing, body, now) : articleUpdate(family, existing, body, now, sanitize);
    await deps.db.query(patch.sql, patch.values.concat(id));
    await attachJsonAssets(request, String(id), body);
    const data = (await deps.db.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0];
    return { success: true as const, data };
  }

  async function remove(request: FastifyRequest, reply: FastifyReply) {
    const id = readDetailId(request);
    const ownerId = String(id);
    const existing = (await deps.db.query(`SELECT id FROM ${table} WHERE id=$1`, [id])).rows[0];
    if (!existing) return reply.code(404).send({ message: 'Content not found' });
    const refs = (await deps.db.query(
      `SELECT owner_slot, asset_id FROM content_asset_refs WHERE owner_type=$1 AND owner_id=$2`,
      [family, ownerId],
    )).rows;
    await deps.db.withTransaction(async tx => {
      await tx.query(`DELETE FROM content_asset_refs WHERE owner_type=$1 AND owner_id=$2`, [family, ownerId]);
      await tx.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
    });
    const bySlot = new Map<string, AssetId[]>();
    for (const row of refs) {
      const slot = row.owner_slot as string;
      const list = bySlot.get(slot) ?? [];
      list.push(row.asset_id as AssetId);
      bySlot.set(slot, list);
    }
    for (const [slot, assetIds] of bySlot) {
      if (assetIds.length) await media.release(ownerFor(family, ownerId, slot), assetIds);
    }
    return { success: true as const, message: 'Deleted' };
  }
}

function articleInsert(family: JsonWriteFamily, body: Record<string, unknown>, now: Date, sanitize: (html: string) => string) {
  const input = sanitizeContentRichFields(family, { ...body }, sanitize);
  const status = typeof input.status === 'string' ? input.status : 'draft';
  const published = publishedAt(status, input.publishedAt, null, now, true);
  const category = typeof input.category === 'string' ? input.category : (family === 'news' ? 'news' : family);
  if (family === 'news') {
    return {
      sql: `INSERT INTO news(title,content,excerpt,thumbnail_url,category,status,published_at,is_highlight,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      values: [input.title, input.content, input.excerpt ?? null, input.thumbnailUrl ?? null, category, status,
        published, input.isHighlight ?? false, now],
    };
  }
  return {
    sql: `INSERT INTO ${tables[family]}(title,content,excerpt,thumbnail_url,category,status,published_at,created_at,updated_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
    values: [input.title, input.content, input.excerpt ?? null, input.thumbnailUrl ?? null, category, status, published, now],
  };
}

function articleUpdate(
  family: JsonWriteFamily, existing: Record<string, unknown>, body: Record<string, unknown>, now: Date, sanitize: (html: string) => string,
) {
  const merged = {
    title: body.title ?? existing.title, content: body.content ?? existing.content, excerpt: body.excerpt === undefined ? existing.excerpt : body.excerpt,
    thumbnailUrl: body.thumbnailUrl === undefined ? existing.thumbnail_url : body.thumbnailUrl,
    category: body.category ?? existing.category, status: body.status ?? existing.status,
    ...(body.publishedAt !== undefined ? { publishedAt: body.publishedAt } : {}),
    isHighlight: body.isHighlight === undefined ? existing.is_highlight : body.isHighlight,
  };
  const input = sanitizeContentRichFields(family, merged, sanitize);
  const status = input.status as string;
  const previousPublished = existing.published_at instanceof Date ? existing.published_at : existing.published_at ? new Date(existing.published_at as string) : null;
  const published = publishedAt(status, body.publishedAt, previousPublished, now);
  if (family === 'news') {
    return {
      sql: `UPDATE news SET title=$1,content=$2,excerpt=$3,thumbnail_url=$4,category=$5,status=$6,published_at=$7,is_highlight=$8,updated_at=$9 WHERE id=$10`,
      values: [input.title, input.content, input.excerpt ?? null, input.thumbnailUrl ?? null, input.category, status, published, input.isHighlight ?? false, now],
    };
  }
  return {
    sql: `UPDATE ${tables[family]} SET title=$1,content=$2,excerpt=$3,thumbnail_url=$4,category=$5,status=$6,published_at=$7,updated_at=$8 WHERE id=$9`,
    values: [input.title, input.content, input.excerpt ?? null, input.thumbnailUrl ?? null, input.category, status, published, now],
  };
}

function productInsert(body: Record<string, unknown>, now: Date) {
  return {
    sql: `INSERT INTO products(name,image_url,category,description,price,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    values: [body.name, body.imageUrl ?? null, body.category, body.description ?? null, body.price, now],
  };
}
function productUpdate(existing: Record<string, unknown>, body: Record<string, unknown>, now: Date) {
  return {
    sql: `UPDATE products SET name=$1,image_url=$2,category=$3,description=$4,price=$5,updated_at=$6 WHERE id=$7`,
    values: [
      body.name ?? existing.name,
      body.imageUrl === undefined ? existing.image_url : body.imageUrl,
      body.category ?? existing.category,
      body.description === undefined ? existing.description : body.description,
      body.price ?? existing.price,
      now,
    ],
  };
}
