import type { AssetKind, AssetOwner, AssetVisibility } from '@pharmacy/contracts/media';
import { MediaError } from './types';

const domains: AssetOwner['domain'][] = ['content', 'requests', 'academy', 'registry'];
const kinds: AssetKind[] = [
  'website-image', 'public-document', 'request-document', 'personal-file', 'academy-slip', 'academy-document',
];

const image = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const pdf = ['application/pdf'] as const;
const office = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
] as const;

const allowedMime: Record<AssetKind, readonly string[]> = {
  'website-image': image,
  'public-document': [...pdf, ...office],
  'request-document': [...pdf, ...office, ...image],
  'personal-file': [...pdf, ...office, ...image],
  'academy-slip': [...image, ...pdf],
  'academy-document': [...pdf, ...office],
};

const extensions: Record<string, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/msword': ['.doc'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.ms-powerpoint': ['.ppt'],
};

export function visibilityFor(kind: AssetKind): AssetVisibility {
  return kind === 'website-image' || kind === 'public-document' ? 'public' : 'private';
}

export const ownerSlotCatalog: Record<AssetOwner['domain'], Record<string, readonly string[]>> = {
  content: {
    news: ['cover', 'body', 'draft'],
    medicine: ['cover', 'body', 'draft'],
    'public-project': ['cover', 'body', 'draft'],
    products: ['image', 'draft'],
    'home-content': ['banner', 'original-banner', 'popup', 'draft'],
    'pharmacist-home-content': ['banner', 'original-banner', 'draft'],
    laws: ['pdf', 'draft'],
    council: ['image', 'original', 'draft'],
    history: ['president', 'secretary', 'original-president', 'original-secretary', 'draft'],
    agencies: ['thumbnail', 'original-thumbnail', 'logo', 'icon', 'draft'],
    'web-settings': ['logo', 'draft'],
    honor: ['image', 'original', 'draft'],
    services: ['icon', 'draft'],
    'policy-projects': ['pdf', 'draft'],
    'other-service-items': ['pdf', 'draft'],
  },
  requests: { request: ['document', 'slip', 'personal'] },
  academy: { course: ['cover', 'document'], lesson: ['document'], order: ['slip'] },
  registry: { pharmacist: ['photo'] },
};

export function parseOwner(value: AssetOwner): AssetOwner {
  if (!value || !domains.includes(value.domain) || !value.type || !value.id || !value.slot)
    throw new MediaError(400, 'Invalid media owner');
  if ([value.type, value.id, value.slot].some(part => part.length > 128 || /[\\/\x00-\x1f\x7f]/.test(part)))
    throw new MediaError(400, 'Invalid media owner');
  const slots = ownerSlotCatalog[value.domain]?.[value.type];
  if (!slots?.includes(value.slot)) throw new MediaError(400, 'Invalid media owner');
  return value;
}

export function parseKind(value: unknown): AssetKind {
  if (typeof value !== 'string' || !(kinds as readonly string[]).includes(value))
    throw new MediaError(400, 'Unknown media kind');
  return value as AssetKind;
}

export function parseFilename(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || [...value].length > 255 || /[\\/\x00-\x1f\x7f]/.test(value))
    throw new MediaError(400, 'Invalid filename');
  return value.trim();
}

export function allowedMimeFor(kind: AssetKind, mime: string, filename: string): string {
  if (!allowedMime[kind].includes(mime)) throw new MediaError(415, 'Unsupported media type');
  const suffix = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  if (!(extensions[mime] ?? []).includes(suffix)) throw new MediaError(415, 'Unsupported media type');
  return mime;
}

export function ownerEquals(left: AssetOwner, right: AssetOwner): boolean {
  return left.domain === right.domain && left.type === right.type && left.id === right.id && left.slot === right.slot;
}
