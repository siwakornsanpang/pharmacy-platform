import { randomUUID } from 'node:crypto';
import type { AssetId, AssetOwner } from '@pharmacy/contracts/media';
import type { Database, QueryClient } from '../../db/client';
import type { MediaStorage } from './storage';
import { parseOwner } from './policy';
import { MediaError } from './types';

export interface AttachmentReservation {
  id: string;
  owner: AssetOwner;
  assetIds: AssetId[];
}

export interface MediaOwnerPort {
  isReferenced(owner: AssetOwner, assetId: AssetId): Promise<boolean>;
}

export interface MediaLifecycleDependencies {
  db: Database;
  clock: () => Date;
  storage: MediaStorage;
  ownerPorts: Partial<Record<AssetOwner['domain'], MediaOwnerPort>>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseAssetId(value: string): AssetId {
  if (!uuid.test(value)) throw new MediaError(400, 'Invalid asset');
  return value;
}

function uniqueIds(assetIds: AssetId[]): AssetId[] {
  const ids = [...new Set(assetIds.map(parseAssetId))];
  if (!ids.length) throw new MediaError(400, 'Invalid asset');
  return ids;
}

function ownerParams(owner: AssetOwner) {
  return [owner.domain, owner.type, owner.id, owner.slot] as const;
}

function sameRecord(left: AssetOwner, right: AssetOwner) {
  return left.domain === right.domain && left.type === right.type && left.id === right.id;
}

export function createMediaLifecycle({ db, clock, storage, ownerPorts }: MediaLifecycleDependencies) {
  async function lockAsset(tx: QueryClient, assetId: AssetId) {
    const asset = (await tx.query(
      'SELECT id,owner_domain,owner_type,owner_id,owner_slot,object_key FROM media_assets WHERE id=$1 FOR UPDATE',
      [assetId],
    )).rows[0];
    if (!asset) throw new MediaError(404, 'Asset not found');
    const pins = (await tx.query(
      'SELECT id,owner_domain,owner_type,owner_id,owner_slot,state FROM media_asset_pins WHERE asset_id=$1 FOR UPDATE',
      [assetId],
    )).rows;
    return {
      id: asset.id as string,
      owner: {
        domain: asset.owner_domain as AssetOwner['domain'],
        type: asset.owner_type as string,
        id: asset.owner_id as string,
        slot: asset.owner_slot as string,
      },
      objectKey: asset.object_key as string,
      pins,
    };
  }

  async function remaining(tx: QueryClient, assetId: AssetId) {
    const pins = (await tx.query(
      `SELECT state FROM media_asset_pins WHERE asset_id=$1 AND state IN ('pending','confirmed')`,
      [assetId],
    )).rows.length;
    const refs = (await tx.query(
      'SELECT 1 FROM media_asset_references WHERE asset_id=$1 LIMIT 1',
      [assetId],
    )).rows.length;
    return pins + refs;
  }

  async function enqueue(tx: QueryClient, assetId: AssetId, reason: string) {
    await tx.query(
      'INSERT INTO media_cleanup_jobs(asset_id,reason,created_at) VALUES($1,$2,$3)',
      [assetId, reason, clock()],
    );
  }

  async function reserveAttach(owner: AssetOwner, assetIds: AssetId[]): Promise<AttachmentReservation> {
    const parsed = parseOwner(owner);
    const ids = uniqueIds(assetIds);
    return db.withTransaction(async tx => {
      for (const assetId of ids) {
        const asset = await lockAsset(tx, assetId);
        if (!sameRecord(asset.owner, parsed)) throw new MediaError(403, 'Media owner denied');
        if (asset.pins.some(pin => pin.state === 'deleting')) throw new MediaError(409, 'Asset is deleting');
        const pending = asset.pins.find(pin =>
          pin.state === 'pending' && pin.owner_domain === parsed.domain && pin.owner_type === parsed.type &&
          pin.owner_id === parsed.id && pin.owner_slot === parsed.slot);
        if (!pending) {
          await tx.query(
            `INSERT INTO media_asset_pins
            (asset_id,owner_domain,owner_type,owner_id,owner_slot,state,created_at)
            VALUES($1,$2,$3,$4,$5,'pending',$6)`,
            [assetId, ...ownerParams(parsed), clock()],
          );
        }
      }
      return { id: randomUUID(), owner: parsed, assetIds: ids };
    });
  }

  async function confirmAttach(owner: AssetOwner, assetIds: AssetId[]): Promise<void> {
    const parsed = parseOwner(owner);
    const ids = uniqueIds(assetIds);
    try {
      await db.withTransaction(async tx => {
        for (const assetId of ids) {
          const asset = await lockAsset(tx, assetId);
          if (!sameRecord(asset.owner, parsed)) throw new MediaError(403, 'Media owner denied');
          if (asset.pins.some(pin => pin.state === 'deleting')) throw new MediaError(409, 'Asset is deleting');
          const staged = asset.pins.some(pin =>
            pin.owner_domain === parsed.domain && pin.owner_type === parsed.type &&
            pin.owner_id === parsed.id && pin.owner_slot === parsed.slot &&
            (pin.state === 'pending' || pin.state === 'confirmed'));
          if (!staged) throw new MediaError(403, 'Media owner denied');
          await tx.query(
            `UPDATE media_asset_pins SET state='confirmed'
             WHERE asset_id=$1 AND owner_domain=$2 AND owner_type=$3 AND owner_id=$4 AND owner_slot=$5
               AND state IN ('pending','confirmed')`,
            [assetId, ...ownerParams(parsed)],
          );
          const existing = (await tx.query(
            `SELECT 1 FROM media_asset_references
             WHERE asset_id=$1 AND owner_domain=$2 AND owner_type=$3 AND owner_id=$4 AND owner_slot=$5`,
            [assetId, ...ownerParams(parsed)],
          )).rows[0];
          if (!existing) {
            await tx.query(
              `INSERT INTO media_asset_references
              (asset_id,owner_domain,owner_type,owner_id,owner_slot,created_at)
              VALUES($1,$2,$3,$4,$5,$6)`,
              [assetId, ...ownerParams(parsed), clock()],
            );
          }
        }
      });
    } catch (error) {
      if (error instanceof MediaError) throw error;
      await db.withTransaction(tx => enqueue(tx, ids[0]!, 'confirm-failure'));
      throw error;
    }
  }

  async function deleteIfUnreferenced(tx: QueryClient, assetId: AssetId, objectKey: string, owner: AssetOwner) {
    if (await remaining(tx, assetId)) return false;
    await tx.query(`UPDATE media_asset_pins SET state='deleting' WHERE asset_id=$1`, [assetId]);
    const marked = (await tx.query(
      `SELECT 1 FROM media_asset_pins WHERE asset_id=$1 AND state='deleting' LIMIT 1`,
      [assetId],
    )).rows[0];
    if (!marked) {
      await tx.query(
        `INSERT INTO media_asset_pins
        (asset_id,owner_domain,owner_type,owner_id,owner_slot,state,created_at)
        VALUES($1,$2,$3,$4,$5,'deleting',$6)`,
        [assetId, ...ownerParams(owner), clock()],
      );
    }
    if (storage.deletes.includes(objectKey)) return true;
    try {
      await storage.delete(objectKey);
      return true;
    } catch {
      await enqueue(tx, assetId, 'delete-failed');
      return false;
    }
  }

  async function release(owner: AssetOwner, assetIds: AssetId[]): Promise<void> {
    const parsed = parseOwner(owner);
    const ids = uniqueIds(assetIds);
    await db.withTransaction(async tx => {
      for (const assetId of ids) {
        const asset = await lockAsset(tx, assetId);
        if (!sameRecord(asset.owner, parsed) &&
          !asset.pins.some(pin => pin.owner_domain === parsed.domain && pin.owner_id === parsed.id))
          throw new MediaError(403, 'Media owner denied');
        await tx.query(
          `DELETE FROM media_asset_references
           WHERE asset_id=$1 AND owner_domain=$2 AND owner_type=$3 AND owner_id=$4 AND owner_slot=$5`,
          [assetId, ...ownerParams(parsed)],
        );
        await tx.query(
          `DELETE FROM media_asset_pins
           WHERE asset_id=$1 AND owner_domain=$2 AND owner_type=$3 AND owner_id=$4 AND owner_slot=$5
             AND state='confirmed'`,
          [assetId, ...ownerParams(parsed)],
        );
        await deleteIfUnreferenced(tx, assetId, asset.objectKey, parsed);
      }
    });
  }

  async function ownerStillHolds(asset: { owner: AssetOwner }, assetId: AssetId): Promise<boolean | 'unavailable'> {
    const port = ownerPorts[asset.owner.domain];
    if (!port) return 'unavailable';
    try { return await port.isReferenced(asset.owner, assetId); }
    catch { return 'unavailable'; }
  }

  async function reconcileMedia(options: { dryRun: boolean; writersFrozen: boolean }) {
    let retained = 0, deleted = 0, retry = 0;
    const jobs = (await db.query(
      'SELECT id,asset_id,reason FROM media_cleanup_jobs ORDER BY id',
    )).rows;
    retry = jobs.length;
    if (options.dryRun || !options.writersFrozen) {
      retained = (await db.query('SELECT count(*)::int AS n FROM media_assets')).rows[0]!.n as number;
      return { retained, deleted, retry };
    }
    await db.withTransaction(async tx => {
      for (const job of jobs) {
        const assetId = job.asset_id as string;
        const asset = (await tx.query(
          'SELECT id,owner_domain,owner_type,owner_id,owner_slot,object_key FROM media_assets WHERE id=$1 FOR UPDATE',
          [assetId],
        )).rows[0];
        if (!asset) {
          await tx.query('DELETE FROM media_cleanup_jobs WHERE id=$1', [job.id]);
          continue;
        }
        const held = await ownerStillHolds({
          owner: {
            domain: asset.owner_domain as AssetOwner['domain'],
            type: asset.owner_type as string,
            id: asset.owner_id as string,
            slot: asset.owner_slot as string,
          },
        }, assetId);
        if (held === true || held === 'unavailable') {
          retained += 1;
          continue;
        }
        if (await remaining(tx, assetId)) {
          retained += 1;
          continue;
        }
        const removed = await deleteIfUnreferenced(tx, assetId, asset.object_key as string, {
            domain: asset.owner_domain as AssetOwner['domain'],
            type: asset.owner_type as string,
            id: asset.owner_id as string,
            slot: asset.owner_slot as string,
          });
        if (removed) {
          deleted += 1;
          await tx.query('DELETE FROM media_cleanup_jobs WHERE id=$1', [job.id]);
        } else retained += 1;
      }
    });
    return { retained, deleted, retry };
  }

  return { reserveAttach, confirmAttach, release, reconcileMedia };
}

export type MediaLifecycle = ReturnType<typeof createMediaLifecycle>;
