import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { AssetKind, AssetOwner, SignedDownload, StagedAsset } from '@pharmacy/contracts/media';
import type { Database } from '../../db/client';
import type { BackendConfig } from '../../config/server';
import type { StaffActor } from '../access/service';
import { allowedMimeFor, parseFilename, parseKind, parseOwner, visibilityFor } from './policy';
import type { MediaStorage } from './storage';
import type {
  AuthorizedAssetRead, MediaOwnerAuthorizer, StoredAsset, VerifiedUploadActor,
} from './types';
import { MediaError } from './types';
import { sniffMime } from './validate';

export interface MediaServiceDependencies {
  db: Database;
  config: BackendConfig;
  clock: () => Date;
  storage: MediaStorage;
  authorizers: Record<AssetOwner['domain'], MediaOwnerAuthorizer>;
  resolveStaff?: (userId: number, sessionId: string) => Promise<StaffActor>;
}

function staged(row: { id: string; owner: AssetOwner; kind: AssetKind; visibility: 'public' | 'private' }): StagedAsset {
  return { id: row.id, owner: row.owner, kind: row.kind, visibility: row.visibility };
}

export function createMediaService({ db, config, clock, storage, authorizers }: MediaServiceDependencies) {
  async function authorizeUpload(owner: AssetOwner, kind: AssetKind, actor: VerifiedUploadActor) {
    const authorizer = authorizers[owner.domain];
    if (!authorizer || !await authorizer.authorizeUpload(owner, kind, actor))
      throw new MediaError(403, 'Media owner denied');
  }

  async function stageUpload(input: {
    owner: AssetOwner; kind: AssetKind; filename: string; declaredMime: string;
    path: string; sniff: Buffer; size: number; actor: VerifiedUploadActor;
  }): Promise<StagedAsset> {
    const owner = parseOwner(input.owner);
    const kind = parseKind(input.kind);
    const filename = parseFilename(input.filename);
    const mime = sniffMime(allowedMimeFor(kind, input.declaredMime, filename), input.sniff);
    await authorizeUpload(owner, kind, input.actor);
    const visibility = visibilityFor(kind);
    const id = randomUUID();
    const objectKey = `assets/${id}`;
    await storage.upload({ objectKey, mime, size: input.size, path: input.path, visibility });
    await db.withTransaction(async tx => {
      await tx.query(`INSERT INTO media_assets
        (id,owner_domain,owner_type,owner_id,owner_slot,kind,visibility,filename,mime,byte_size,object_key,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, owner.domain, owner.type, owner.id, owner.slot, kind, visibility, filename, mime, input.size, objectKey, clock()]);
      await tx.query(`INSERT INTO media_asset_pins
        (asset_id,owner_domain,owner_type,owner_id,owner_slot,state,created_at)
        VALUES($1,$2,$3,$4,$5,'pending',$6)`,
      [id, owner.domain, owner.type, owner.id, owner.slot, clock()]);
    });
    return staged({ id, owner, kind, visibility });
  }

  async function loadAsset(assetId: string): Promise<StoredAsset | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId))
      throw new MediaError(400, 'Invalid asset');
    const row = (await db.query(`SELECT id,owner_domain,owner_type,owner_id,owner_slot,kind,visibility,object_key
      FROM media_assets WHERE id=$1`, [assetId])).rows[0];
    if (!row) return null;
    return {
      id: row.id as string,
      owner: {
        domain: row.owner_domain as AssetOwner['domain'], type: row.owner_type as string,
        id: row.owner_id as string, slot: row.owner_slot as string,
      },
      kind: row.kind as AssetKind,
      visibility: row.visibility as 'public' | 'private',
      objectKey: row.object_key as string,
    };
  }

  async function authorizeDownload(asset: StoredAsset, actor: StaffActor | null): Promise<AuthorizedAssetRead> {
    const authorizer = authorizers[asset.owner.domain];
    const decision = authorizer
      ? await authorizer.authorizeDownload({
        assetId: asset.id, owner: asset.owner, kind: asset.kind, visibility: asset.visibility, actor,
      })
      : null;
    if (!decision) throw new MediaError(403, 'Media owner denied');
    return decision;
  }

  async function issuePrivateDownload(assetId: string, decision: AuthorizedAssetRead): Promise<SignedDownload> {
    const asset = await loadAsset(assetId);
    if (!asset) throw new MediaError(404, 'Asset not found');
    if (asset.id !== decision.assetId || asset.owner.domain !== decision.owner.domain ||
      asset.owner.type !== decision.owner.type || asset.owner.id !== decision.owner.id ||
      asset.owner.slot !== decision.owner.slot) throw new MediaError(403, 'Media owner denied');
    const expiresAt = new Date(clock().getTime() + config.privateAssetTtlSeconds * 1000);
    const url = await storage.sign(asset.objectKey, expiresAt);
    return { url, expiresAt: expiresAt.toISOString() };
  }

  return {
    stageUpload, loadAsset, authorizeDownload, issuePrivateDownload,
    streamFrom(path: string) { return createReadStream(path); },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
