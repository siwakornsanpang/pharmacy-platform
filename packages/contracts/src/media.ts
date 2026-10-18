export type AssetId = string;
export type AssetDomain = 'content' | 'requests' | 'academy' | 'registry';
export type AssetKind =
  | 'website-image'
  | 'public-document'
  | 'request-document'
  | 'personal-file'
  | 'academy-slip'
  | 'academy-document';
export type AssetVisibility = 'public' | 'private';

export interface AssetOwner {
  domain: AssetDomain;
  type: string;
  id: string;
  slot: string;
}
export interface StagedAsset {
  id: AssetId;
  owner: AssetOwner;
  kind: AssetKind;
  visibility: AssetVisibility;
}
export interface UploadIntentMetadata {
  filename: string;
  declaredMime: string;
  size: number;
}
export interface UploadIntent {
  id: string;
  uploadUrl: string;
  ticket: string;
  expiresAt: string;
}
export interface SignedDownload {
  url: string;
  expiresAt: string;
}

const object = (properties: Readonly<Record<string, unknown>>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
}) as const;
const uuid = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' } as const;
const httpsUrl = { type: 'string', pattern: '^https://[^\\s]+$' } as const;
const timestamp = { type: 'string', minLength: 20, maxLength: 40 } as const;
const domains = ['content', 'requests', 'academy', 'registry'] as const;
const kinds = [
  'website-image', 'public-document', 'request-document', 'personal-file', 'academy-slip', 'academy-document',
] as const;
export const AssetOwnerSchema = object({
  domain: { type: 'string', enum: [...domains] },
  type: { type: 'string', minLength: 1, maxLength: 64 },
  id: { type: 'string', minLength: 1, maxLength: 128 },
  slot: { type: 'string', minLength: 1, maxLength: 64 },
});
export const StagedAssetSchema = object({
  id: uuid,
  owner: AssetOwnerSchema,
  kind: { type: 'string', enum: [...kinds] },
  visibility: { type: 'string', enum: ['public', 'private'] },
});
export const UploadIntentMetadataSchema = object({
  filename: { type: 'string', minLength: 1, maxLength: 255 },
  declaredMime: { type: 'string', minLength: 1, maxLength: 127 },
  size: { type: 'integer', minimum: 1, maximum: 104857600 },
});
export const UploadIntentSchema = object({
  id: uuid,
  uploadUrl: httpsUrl,
  ticket: { type: 'string', pattern: '^[a-f0-9]{64}$' },
  expiresAt: timestamp,
});
export const SignedDownloadSchema = object({
  url: httpsUrl,
  expiresAt: timestamp,
});
export const assetDomains = domains;
export const assetKinds = kinds;
