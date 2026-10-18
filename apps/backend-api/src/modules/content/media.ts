import type { ContentImageSource } from '@pharmacy/contracts/content';
import { isContentImage } from '@pharmacy/contracts/content';
import type { AssetId, AssetOwner } from '@pharmacy/contracts/media';
import { randomUUID } from 'node:crypto';
import type { Database, QueryClient } from '../../db/client';
import { MediaError, type MediaLifecycle } from '../media';

export async function isContentAssetReferenced(db: Pick<Database, 'query'>, owner: AssetOwner, assetId: AssetId) {
  if (owner.domain !== 'content') return false;
  const row = (await db.query(
    'SELECT 1 FROM content_asset_refs WHERE asset_id=$1 LIMIT 1',
    [assetId],
  )).rows[0];
  return Boolean(row);
}

export function createContentMediaPort(db: Database) {
  return {
    isReferenced: (owner: AssetOwner, assetId: AssetId) => isContentAssetReferenced(db, owner, assetId),
  };
}

export function publicContentAssetUrl(input: {
  supabaseUrl?: string;
  contentImageSources?: readonly ContentImageSource[];
  assetId: string;
}): string | null {
  const origin = input.supabaseUrl?.replace(/\/$/, '');
  if (!origin) return null;
  const url = `${origin}/storage/v1/object/public/public-media/assets/${input.assetId}`;
  const sources = input.contentImageSources ?? [];
  if (sources.length && !isContentImage(url, sources)) return null;
  return url;
}

/** Uploads are owned by staff:${id}/draft until the article exists. Retarget before reserveAttach. */
export async function claimDraftContentAssets(input: {
  db: Database;
  family: string;
  staffId: number;
  entityId: string;
  slot: string;
  assetIds: AssetId[];
}) {
  const ids = [...new Set(input.assetIds)];
  if (!ids.length) return;
  const draftId = `staff:${input.staffId}`;
  await input.db.withTransaction(async tx => {
    for (const assetId of ids) {
      const asset = (await tx.query(
        `SELECT id, owner_domain, owner_type, owner_id, owner_slot FROM media_assets WHERE id=$1 FOR UPDATE`,
        [assetId],
      )).rows[0];
      if (!asset) throw new MediaError(404, 'Asset not found');
      if (asset.owner_domain !== 'content' || asset.owner_type !== input.family)
        throw new MediaError(403, 'Media owner denied');
      if (asset.owner_id === input.entityId) continue;
      if (asset.owner_id !== draftId || asset.owner_slot !== 'draft')
        throw new MediaError(403, 'Media owner denied');
      await tx.query(
        `UPDATE media_assets SET owner_id=$2, owner_slot=$3 WHERE id=$1`,
        [assetId, input.entityId, input.slot],
      );
      const pins = await tx.query(
        `UPDATE media_asset_pins SET owner_id=$2, owner_slot=$3
         WHERE asset_id=$1 AND owner_domain='content' AND owner_type=$4 AND owner_id=$5 AND owner_slot='draft'
         RETURNING id`,
        [assetId, input.entityId, input.slot, input.family, draftId],
      );
      if (!pins.rows.length) throw new MediaError(403, 'Media owner denied');
    }
  });
}

export async function commitContentAssets(input: {
  db: Database;
  media: MediaLifecycle;
  owner: AssetOwner;
  attachAssetIds: AssetId[];
  releaseAssetIds: AssetId[];
  write: (tx: QueryClient) => Promise<void>;
}) {
  if (input.attachAssetIds.length) await input.media.reserveAttach(input.owner, input.attachAssetIds);
  const operationId = randomUUID();
  try {
    await input.db.withTransaction(async tx => {
      await tx.query(
        `INSERT INTO content_media_intents
        (operation_id,owner_type,owner_id,owner_slot,attach_asset_ids,release_asset_ids,status,created_at)
        VALUES($1,$2,$3,$4,$5::json,$6::json,'pending',now())`,
        [operationId, input.owner.type, input.owner.id, input.owner.slot,
          JSON.stringify(input.attachAssetIds), JSON.stringify(input.releaseAssetIds)],
      );
      for (const assetId of input.attachAssetIds) {
        await tx.query(
          `INSERT INTO content_asset_refs(owner_type,owner_id,owner_slot,asset_id,created_at)
           VALUES($1,$2,$3,$4,now())
           ON CONFLICT (owner_type,owner_id,owner_slot,asset_id) DO NOTHING`,
          [input.owner.type, input.owner.id, input.owner.slot, assetId],
        );
      }
      for (const assetId of input.releaseAssetIds) {
        await tx.query(
          `DELETE FROM content_asset_refs
           WHERE owner_type=$1 AND owner_id=$2 AND owner_slot=$3 AND asset_id=$4`,
          [input.owner.type, input.owner.id, input.owner.slot, assetId],
        );
      }
      await input.write(tx);
    });
  } catch (error) {
    return { failedReferenceCommit: true, error };
  }
  try {
    if (input.attachAssetIds.length) await input.media.confirmAttach(input.owner, input.attachAssetIds);
  } catch (error) {
    return { confirmFailure: true, error };
  }
  if (input.releaseAssetIds.length) await input.media.release(input.owner, input.releaseAssetIds);
  await input.db.query(
    `UPDATE content_media_intents SET status='complete' WHERE operation_id=$1`,
    [operationId],
  );
  return { failedReferenceCommit: false, confirmFailure: false };
}
