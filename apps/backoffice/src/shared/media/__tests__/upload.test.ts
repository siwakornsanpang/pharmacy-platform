import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { uploadWithIntent, MediaUploadError } from '../upload';
import { publicWebsiteImageUrl } from '../family-upload';

const intent = {
  id: '11111111-1111-4111-8111-111111111111',
  uploadUrl: 'https://upload.example.test/api/media/uploads/11111111-1111-4111-8111-111111111111',
  ticket: 'a'.repeat(64),
  expiresAt: '2026-10-15T12:05:00.000Z',
};
const staged = {
  id: intent.id,
  owner: { domain: 'content', type: 'news', id: '1', slot: 'cover' },
  kind: 'website-image',
  visibility: 'public',
};

const upstream = vi.fn<typeof fetch>();
beforeEach(() => {
  upstream.mockReset();
  vi.stubGlobal('fetch', upstream);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('sends the raw file to Render with the ticket and never retries or uses staff JWT', async () => {
  upstream.mockResolvedValueOnce(Response.json(staged));
  const file = new File([new Uint8Array([1, 2, 3])], 'รูป.jpg', { type: 'image/jpeg' });
  await expect(uploadWithIntent(intent, file)).resolves.toEqual(staged);
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, init] = upstream.mock.calls[0]!;
  expect(String(url)).toBe(intent.uploadUrl);
  expect(init).toMatchObject({ method: 'POST', credentials: 'omit', cache: 'no-store' });
  expect(init?.body).toBe(file);
  const headers = new Headers(init?.headers);
  expect(headers.get('x-upload-ticket')).toBe(intent.ticket);
  expect(headers.get('authorization')).toBeNull();
  expect(headers.get('content-type')).toBe('application/octet-stream');
  expect(String(url).includes('/api/backend')).toBe(false);
});

it('propagates abort and HTTP errors without retrying the same ticket', async () => {
  const file = new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' });
  const controller = new AbortController();
  controller.abort();
  await expect(uploadWithIntent(intent, file, controller.signal)).rejects.toMatchObject({ status: 499 });
  expect(upstream).toHaveBeenCalledTimes(0);
  upstream.mockResolvedValueOnce(new Response('no', { status: 409 }));
  await expect(uploadWithIntent(intent, file)).rejects.toBeInstanceOf(MediaUploadError);
  expect(upstream).toHaveBeenCalledTimes(1);
  await expect(uploadWithIntent({ ...intent, uploadUrl: 'http://upload.example.test/api/media/uploads/' + intent.id }, file))
    .rejects.toMatchObject({ status: 400 });
  expect(upstream).toHaveBeenCalledTimes(1);
});

it('builds a public-media URL from configured sources instead of a blob URL', () => {
  vi.stubEnv('NEXT_PUBLIC_CONTENT_IMAGE_SOURCES', JSON.stringify([
    { origin: 'https://media.example.test', pathPrefix: '/storage/v1/object/public/uploads/' },
    { origin: 'https://media.example.test', pathPrefix: '/storage/v1/object/public/public-media/' },
  ]));
  expect(publicWebsiteImageUrl(intent.id))
    .toBe('https://media.example.test/storage/v1/object/public/public-media/assets/11111111-1111-4111-8111-111111111111');
});
