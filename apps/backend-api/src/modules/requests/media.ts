import type { AssetId, AssetOwner } from '@pharmacy/contracts/media';
import type { Database } from '../../db/client';

export async function isRequestAssetReferenced(db: Pick<Database, 'query'>, owner: AssetOwner, assetId: AssetId) {
  if (owner.domain !== 'requests') return false;
  const row = (await db.query(
    'SELECT 1 FROM request_asset_refs WHERE asset_id=$1 LIMIT 1',
    [assetId],
  )).rows[0];
  return Boolean(row);
}

export function createRequestMediaPort(db: Database) {
  return {
    isReferenced: (owner: AssetOwner, assetId: AssetId) => isRequestAssetReferenced(db, owner, assetId),
  };
}
