import type {
  AssetKind, AssetOwner, StagedAsset, UploadIntent, UploadIntentMetadata,
} from '@pharmacy/contracts/media';
import type { PermissionKey } from '@pharmacy/contracts/access';
import type { StaffActor } from '../access/service';

export type { AssetKind, AssetOwner, StagedAsset, UploadIntent, UploadIntentMetadata };

export type VerifiedUploadActor =
  | {
    kind: 'staff';
    actorKey: string;
    userId: number;
    sessionId: string;
    requiredCapability: PermissionKey;
  }
  | {
    kind: 'pharmacy-mock';
    actorKey: string;
    subject: string;
    pharmacistLicense: string;
    displayName: string;
  };

export interface AuthorizedAssetRead {
  assetId: string;
  owner: AssetOwner;
  actorKey: string;
}

export class MediaError extends Error {
  constructor(public readonly statusCode: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 503, message: string) {
    super(message);
  }
}

export interface MediaOwnerAuthorizer {
  authorizeUpload(owner: AssetOwner, kind: AssetKind, actor: VerifiedUploadActor): Promise<boolean>;
  authorizeDownload(input: {
    assetId: string;
    owner: AssetOwner;
    kind: AssetKind;
    visibility: 'public' | 'private';
    actor: StaffActor | null;
  }): Promise<AuthorizedAssetRead | null>;
}

export interface StoredAsset {
  id: string;
  owner: AssetOwner;
  kind: AssetKind;
  visibility: 'public' | 'private';
  objectKey: string;
}

export interface ClaimedUploadIntent {
  id: string;
  owner: AssetOwner;
  kind: AssetKind;
  filename: string;
  mime: string;
  size: number;
  actor: VerifiedUploadActor;
}
