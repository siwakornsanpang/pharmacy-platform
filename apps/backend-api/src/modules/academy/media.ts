import { randomUUID } from 'node:crypto';
import type { AssetId, AssetKind, AssetOwner } from '@pharmacy/contracts/media';
import type { AcademyMemberActor } from '@pharmacy/contracts/academy';
import { CAPABILITY } from '@pharmacy/contracts/access';
import type { Database, QueryClient } from '../../db/client';
import type { MediaLifecycle } from '../media';
import type { AuthorizedAssetRead, MediaOwnerAuthorizer, VerifiedUploadActor } from '../media';
import type { StaffActor } from '../access/service';
import { AcademyError } from './public';

export async function isAcademyAssetReferenced(db: Pick<Database, 'query'>, owner: AssetOwner, assetId: AssetId) {
  if (owner.domain !== 'academy') return false;
  const row = (await db.query('SELECT 1 FROM academy_asset_refs WHERE asset_id=$1 LIMIT 1', [assetId])).rows[0];
  return Boolean(row);
}

export function createAcademyMediaPort(db: Database) {
  return {
    isReferenced: (owner: AssetOwner, assetId: AssetId) => isAcademyAssetReferenced(db, owner, assetId),
  };
}

export async function commitAcademyAssets(input: {
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
        `INSERT INTO academy_media_intents
        (operation_id,owner_type,owner_id,owner_slot,attach_asset_ids,release_asset_ids,status,created_at)
        VALUES($1,$2,$3,$4,$5::json,$6::json,'pending',now())`,
        [operationId, input.owner.type, input.owner.id, input.owner.slot,
          JSON.stringify(input.attachAssetIds), JSON.stringify(input.releaseAssetIds)],
      );
      for (const assetId of input.attachAssetIds) {
        await tx.query(
          `INSERT INTO academy_asset_refs(owner_type,owner_id,owner_slot,asset_id,created_at)
           VALUES($1,$2,$3,$4,now())
           ON CONFLICT (owner_type,owner_id,owner_slot,asset_id) DO NOTHING`,
          [input.owner.type, input.owner.id, input.owner.slot, assetId],
        );
      }
      for (const assetId of input.releaseAssetIds) {
        await tx.query(
          `DELETE FROM academy_asset_refs
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
  await input.db.query(`UPDATE academy_media_intents SET status='complete' WHERE operation_id=$1`, [operationId]);
  return { failedReferenceCommit: false, confirmFailure: false };
}

export async function authorizeAcademyUpload(
  db: Pick<Database, 'query'>,
  actor: AcademyMemberActor,
  owner: AssetOwner,
  kind: AssetKind,
): Promise<void> {
  if (owner.domain !== 'academy') throw new AcademyError(403, 'Media owner denied');
  if (kind === 'academy-slip' && owner.type === 'order' && owner.slot === 'slip') {
    if (owner.id === `draft:${actor.subject}`) return;
    const orderId = Number(owner.id);
    if (Number.isSafeInteger(orderId) && orderId > 0) {
      const row = (await db.query(
        `SELECT pharmacist_license FROM academy_orders WHERE id=$1`,
        [orderId],
      )).rows[0];
      if (row && row.pharmacist_license === actor.pharmacistLicense) return;
    }
  }
  throw new AcademyError(403, 'Media owner denied');
}

export async function authorizeAcademyAssetRead(
  db: Pick<Database, 'query'>,
  actor: StaffActor | AcademyMemberActor,
  assetId: AssetId,
): Promise<AuthorizedAssetRead> {
  const row = (await db.query(
    `SELECT owner_domain,owner_type,owner_id,owner_slot,kind,visibility FROM media_assets WHERE id=$1`,
    [assetId],
  )).rows[0];
  if (!row || row.owner_domain !== 'academy') throw new AcademyError(404, 'Asset not found');
  const owner = {
    domain: 'academy' as const, type: row.owner_type as string,
    id: row.owner_id as string, slot: row.owner_slot as string,
  };
  if ('permissions' in actor && actor.permissions.includes(CAPABILITY.MANAGE_ACADEMY))
    return { assetId, owner, actorKey: `staff:${actor.id}` };
  if (!('kind' in actor) || actor.kind !== 'pharmacy-mock') throw new AcademyError(403, 'Media owner denied');
  if (row.kind === 'website-image' && row.visibility === 'public')
    return { assetId, owner, actorKey: `pharmacy-mock:${actor.subject}` };
  if (owner.type === 'lesson' && row.kind === 'academy-document') {
    const enrolled = (await db.query(
      `SELECT 1 FROM academy_enrollments e
       INNER JOIN academy_lessons l ON l.course_id = e.course_id
       WHERE l.id=$1 AND e.pharmacist_license=$2 AND e.status='active'`,
      [Number(owner.id), actor.pharmacistLicense],
    )).rows[0];
    if (enrolled) return { assetId, owner, actorKey: `pharmacy-mock:${actor.subject}` };
  }
  if (owner.type === 'order' && row.kind === 'academy-slip') {
    if (owner.id === `draft:${actor.subject}`)
      return { assetId, owner, actorKey: `pharmacy-mock:${actor.subject}` };
    const orderId = Number(owner.id);
    if (Number.isSafeInteger(orderId) && orderId > 0) {
      const order = (await db.query(
        `SELECT pharmacist_license FROM academy_orders WHERE id=$1`,
        [orderId],
      )).rows[0];
      if (order?.pharmacist_license === actor.pharmacistLicense)
        return { assetId, owner, actorKey: `pharmacy-mock:${actor.subject}` };
    }
  }
  throw new AcademyError(403, 'Media owner denied');
}

function withAsset(assetId: string, owner: AssetOwner, actorKey: string): AuthorizedAssetRead {
  return { assetId, owner, actorKey };
}

export function createAcademyAuthorizer(db: Pick<Database, 'query'>): MediaOwnerAuthorizer {
  return {
    async authorizeUpload(owner, kind, actor: VerifiedUploadActor) {
      if (owner.domain !== 'academy') return false;
      if (actor.kind === 'staff') {
        return actor.requiredCapability === CAPABILITY.MANAGE_ACADEMY &&
          ((kind === 'website-image' && owner.type === 'course') ||
            (kind === 'academy-document' && (owner.type === 'course' || owner.type === 'lesson')));
      }
      try {
        await authorizeAcademyUpload(db, {
          kind: 'pharmacy-mock', subject: actor.subject, pharmacistLicense: actor.pharmacistLicense,
          displayName: actor.displayName,
        }, owner, kind);
        return true;
      } catch {
        return false;
      }
    },
    async authorizeDownload(input) {
      if (input.owner.domain !== 'academy') return null;
      if (input.actor?.permissions.includes(CAPABILITY.MANAGE_ACADEMY))
        return withAsset(input.assetId, input.owner, `staff:${input.actor.id}`);
      if (input.visibility === 'public' && input.kind === 'website-image')
        return withAsset(input.assetId, input.owner, input.actor ? `staff:${input.actor.id}` : 'public');
      return null;
    },
  };
}
