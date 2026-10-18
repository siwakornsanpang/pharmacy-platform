import type { FastifyInstance, FastifyRequest } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { UploadIntentMetadataSchema, type AssetId, type AssetOwner } from '@pharmacy/contracts/media';
import {
  HomeContentAdminDetailSchema, PharmacistHomeContentAdminDetailSchema,
  type ContentBannerAdmin, type ContentPopup,
} from '@pharmacy/contracts/content';
import { MediaError, parseOwner } from '../../media';
import type { ContentDependencies } from '../public';
import { ContentQueryError } from '../route-manifest';
import { claimDraftContentAssets, commitContentAssets, publicContentAssetUrl } from '../media';
import { replaceHomeContent, singletonSerializer, type HomeFamily } from '../singleton-service';
import { mediaUnavailable } from './read-query';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assetIdSchema = { type: 'string', pattern: uuid.source };
const bannerItem = {
  type: 'object', additionalProperties: false,
  required: ['id', 'url', 'originalUrl', 'title', 'clickable', 'linkUrl', 'active', 'order'],
  properties: {
    id: { type: 'string' }, url: { type: 'string' }, originalUrl: { type: 'string' }, title: { type: 'string' },
    clickable: { type: 'boolean' }, linkUrl: { type: 'string' }, active: { type: 'boolean' },
    order: { type: 'integer' }, imageAssetId: assetIdSchema, originalAssetId: assetIdSchema,
  },
} as const;
const popupItem = {
  type: 'object', additionalProperties: false,
  required: ['id', 'url', 'title', 'active', 'order'],
  properties: {
    id: { type: 'string' }, url: { type: 'string' }, title: { type: 'string' },
    active: { type: 'boolean' }, order: { type: 'integer' }, imageAssetId: assetIdSchema,
  },
} as const;
const homeBody = {
  type: 'object', additionalProperties: false, required: ['expectedRevision', 'banners', 'popups'],
  properties: {
    expectedRevision: { type: 'integer', minimum: 0, maximum: 2147483647 },
    banners: { type: 'array', items: bannerItem },
    popups: { type: 'array', items: popupItem },
  },
} as const;
const pharmacistBody = {
  type: 'object', additionalProperties: false, required: ['expectedRevision', 'banners'],
  properties: {
    expectedRevision: { type: 'integer', minimum: 0, maximum: 2147483647 },
    banners: { type: 'array', items: bannerItem },
  },
} as const;

function parseAssetId(value: unknown): AssetId | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !uuid.test(value)) throw new ContentQueryError('Invalid asset');
  return value;
}
function ownerFor(family: HomeFamily, id: string, slot: string): AssetOwner {
  return parseOwner({ domain: 'content', type: family, id, slot });
}
async function listedRefs(db: ContentDependencies['db'], family: HomeFamily, id: string, slot: string) {
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

export function registerHomeWrites(app: FastifyInstance, deps: ContentDependencies, family: HomeFamily) {
  const guard = deps.access.requireCapability(CAPABILITY.MANAGE_HOME);
  const urls = [`/api/admin/content/${family}`, `/api/${family}`];
  const isHome = family === 'home-content';
  const bodySchema = isHome ? homeBody : pharmacistBody;
  const responseSchema = isHome ? HomeContentAdminDetailSchema : PharmacistHomeContentAdminDetailSchema;

  for (const url of urls) {
    app.post(url, {
      onRequest: guard,
      serializerCompiler: singletonSerializer,
      schema: { body: bodySchema, response: { 200: responseSchema } },
    }, save);
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
          requiredCapability: CAPABILITY.MANAGE_HOME,
        },
        owner: ownerFor(family, `staff:${actor.id}`, 'draft'),
        kind: 'website-image',
        metadata: request.body as { filename: string; declaredMime: string; size: number },
      });
    });
  }

  async function save(request: FastifyRequest) {
    const body = request.body as {
      expectedRevision: number;
      banners: Array<Record<string, unknown>>;
      popups?: Array<Record<string, unknown>>;
    };
    const assetUrl = (assetId: string) => publicContentAssetUrl({
      supabaseUrl: deps.config?.supabaseUrl,
      contentImageSources: deps.config?.contentImageSources,
      assetId,
    });
    const banners = body.banners.map(row => bannerFrom(row, assetUrl));
    const popups = isHome ? (body.popups ?? []).map(row => popupFrom(row, assetUrl)) : undefined;
    const input = isHome
      ? { expectedRevision: body.expectedRevision, banners, popups: popups! }
      : { expectedRevision: body.expectedRevision, banners };
    const saved = await replaceHomeContent({ db: deps.db, clock: deps.clock }, family, input);
    if (deps.media && saved.id != null) {
      const actor = request.staffActor;
      if (!actor) throw new MediaError(401, 'Unauthorized');
      const entityId = String(saved.id);
      await attachSlot(family, entityId, actor.id, 'banner', body.banners.map(row => parseAssetId(row.imageAssetId)));
      await attachSlot(family, entityId, actor.id, 'original-banner', body.banners.map(row => parseAssetId(row.originalAssetId)));
      if (isHome) {
        await attachSlot(family, entityId, actor.id, 'popup', (body.popups ?? []).map(row => parseAssetId(row.imageAssetId)));
      }
    }
    return saved;
  }

  async function attachSlot(
    ownerType: HomeFamily, entityId: string, staffId: number, slot: string, assetIds: Array<AssetId | undefined>,
  ) {
    const attachAssetIds = [...new Set(assetIds.filter((id): id is AssetId => Boolean(id)))];
    if (!attachAssetIds.length || !deps.media) return;
    await claimDraftContentAssets({
      db: deps.db, family: ownerType, staffId, entityId, slot, assetIds: attachAssetIds,
    });
    const previous = await listedRefs(deps.db, ownerType, entityId, slot);
    await commitOrThrow({
      db: deps.db, media: deps.media, owner: ownerFor(ownerType, entityId, slot),
      attachAssetIds, releaseAssetIds: previous.filter(assetId => !attachAssetIds.includes(assetId)),
      write: async () => undefined,
    });
  }
}

function persistUrl(url: unknown, assetId: AssetId | undefined, assetUrl: (id: string) => string | null): string {
  if (assetId) {
    const publicUrl = assetUrl(assetId);
    if (publicUrl) return publicUrl;
  }
  if (typeof url !== 'string' || !url || url.startsWith('blob:') || url.startsWith('data:'))
    throw new ContentQueryError('Invalid image');
  return url;
}

function bannerFrom(row: Record<string, unknown>, assetUrl: (id: string) => string | null): ContentBannerAdmin {
  const imageAssetId = parseAssetId(row.imageAssetId);
  const originalAssetId = parseAssetId(row.originalAssetId);
  const url = persistUrl(row.url, imageAssetId, assetUrl);
  return {
    id: String(row.id ?? ''),
    url,
    originalUrl: persistUrl(row.originalUrl ?? url, originalAssetId, assetUrl),
    title: String(row.title ?? ''),
    clickable: Boolean(row.clickable),
    linkUrl: String(row.linkUrl ?? ''),
    active: Boolean(row.active),
    order: Number(row.order ?? 0),
  };
}

function popupFrom(row: Record<string, unknown>, assetUrl: (id: string) => string | null): ContentPopup {
  return {
    id: String(row.id ?? ''),
    url: persistUrl(row.url, parseAssetId(row.imageAssetId), assetUrl),
    title: String(row.title ?? ''),
    active: Boolean(row.active),
    order: Number(row.order ?? 0),
  };
}
