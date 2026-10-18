import { resolveContentImage, validateContentImageSources } from '@pharmacy/contracts/content';
import type { StagedAsset, UploadIntent } from '@pharmacy/contracts/media';
import { browserApi } from '@/lib/api/browser';
import { uploadWithIntent } from './upload';

export type JsonUploadFamily =
  | 'news' | 'medicine' | 'public-project' | 'products'
  | 'home-content' | 'pharmacist-home-content'
  | 'laws' | 'council' | 'history' | 'agencies' | 'web-settings'
  | 'honor' | 'services' | 'policy-projects' | 'other-service-items';

const assetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function publicWebsiteImageUrl(assetId: string): string | null {
  if (!assetIdPattern.test(assetId)) return null;
  let sources;
  try {
    sources = validateContentImageSources(JSON.parse(process.env.NEXT_PUBLIC_CONTENT_IMAGE_SOURCES ?? '[]'));
  } catch {
    return null;
  }
  const rule = sources.find(source => source.pathPrefix.includes('/public-media/')) ?? sources[0];
  if (!rule) return null;
  const prefix = rule.pathPrefix.includes('/public-media/')
    ? rule.pathPrefix
    : '/storage/v1/object/public/public-media/';
  return resolveContentImage(`${rule.origin}${prefix}assets/${assetId}`, sources);
}

export async function uploadFamilyImage(family: JsonUploadFamily, file: File, signal?: AbortSignal): Promise<StagedAsset> {
  const intent = await browserApi<UploadIntent>(`/${family}/upload-image`, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name || 'image.jpg',
      declaredMime: file.type || 'image/jpeg',
      size: file.size,
    }),
    signal,
  });
  return uploadWithIntent(intent, file, signal);
}

export async function stagedWebsiteImage(
  family: JsonUploadFamily, file: File, signal?: AbortSignal,
): Promise<{ assetId: string; url: string }> {
  const staged = await uploadFamilyImage(family, file, signal);
  const url = publicWebsiteImageUrl(staged.id);
  if (!url) throw new Error('Public media URL is not configured');
  return { assetId: staged.id, url };
}

export function persistedMediaUrl(value: string | null | undefined): string | null {
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null;
  return value;
}
