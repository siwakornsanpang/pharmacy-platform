import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiError, requestMetadata } from '@pharmacy/http';

const root = resolve(__dirname, '../..');
const eightMiB = 8_388_608;
const jsonMetadataMaxBytes = 4_000_000;

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

test('content-registry-media Next metadata never accepts file bytes', async () => {
  assert.equal(jsonMetadataMaxBytes, 4_000_000);
  assert.match(source('apps/backend-api/src/modules/media/upload-intents.ts'), /export const jsonMetadataMaxBytes = 4_000_000/);
  const proxy = source('apps/backoffice/src/app/api/backend/[...path]/route.ts');
  assert.match(proxy, /const body = await requestMetadata\(request\)/);
  assert.doesNotMatch(proxy, /request\.formData|arrayBuffer\(|request\.blob/);
  assert.match(proxy, /new NextResponse\(null, \{\s*status: 302/);

  await assert.rejects(
    () => requestMetadata(new Request('https://office.example.test/api/backend/news', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: Buffer.alloc(eightMiB),
    }), jsonMetadataMaxBytes),
    (error: unknown) => error instanceof ApiError && error.kind === 'invalid_request' && error.status === 415,
  );

  const oversized = 'x'.repeat(jsonMetadataMaxBytes + 1);
  await assert.rejects(
    () => requestMetadata(new Request('https://office.example.test/api/backend/news', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: oversized }),
    }), jsonMetadataMaxBytes),
    (error: unknown) => error instanceof ApiError && error.kind === 'too_large',
  );
});

test('content-registry-media upload helper omits credentials and never carries a staff JWT', () => {
  const upload = source('apps/backoffice/src/shared/media/upload.ts');
  assert.match(upload, /credentials: 'omit'/);
  assert.match(upload, /cache: 'no-store'/);
  assert.doesNotMatch(upload, /Authorization|pharmacy_staff|localStorage|JWT_SECRET/);
  const native = source('packages/http/src/index.ts');
  assert.match(native, /cache: 'no-store'/);
  const storage = source('apps/backend-api/src/modules/media/storage.ts');
  assert.match(storage, /https:\/\/storage\.example\.test\/signed\//);
  assert.doesNotMatch(storage, /supabase\.co|onrender\.com/);
});
