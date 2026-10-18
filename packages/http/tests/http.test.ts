import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError, apiPath, isAddressableSegment, metadataText, nativeRequest, decodeResponse, requestMetadata, metadataHeaders, rejectsAuthorityHeaders } from '../src/index.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('one path decoder admits encoded data symbols and rejects traversal/destinations', () => {
  assert.equal(apiPath('/api/roles/editor%40east%3Aone%23two%3Fthree'), '/roles/editor%40east%3Aone%23two%3Fthree');
  for (const path of ['https://evil.test/x', '//evil.test', '/a/%2e%2e/b', '/a%2fb', '/a%5cb', '/%252e%252e', '/a#fragment'])
    assert.throws(() => apiPath(path), ApiError);
  for (const role of ['.', '..', '...', 'a/b', 'a\\b', 'a%b', 'a\u0000b']) assert.equal(isAddressableSegment(role), false);
  for (const role of ['editor@east', 'editor:east', 'editor#east', 'editor?east', 'ก']) assert.equal(isAddressableSegment(role), true);
});
test('stream counting is byte based and cancels an oversized stream before parsing', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(4_000_001)); }, cancel() { cancelled = true; } });
  await assert.rejects(metadataText(body), error => error instanceof ApiError && error.status === 413);
  assert.equal(cancelled, true);
  assert.equal(await metadataText(new Response('"ก"').body, 5), '"ก"');
  await assert.rejects(metadataText(new Response('"ก"').body, 4), error => error instanceof ApiError && error.status === 413);
});
test('JSON request guard ignores claimed length and disallows files and read bodies', async () => {
  const request = new Request('https://fixture.test/', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '1' }, body: '"123456"' });
  await assert.rejects(requestMetadata(request, 5), error => error instanceof ApiError && error.status === 413);
  assert.throws(() => metadataHeaders({ method: 'POST', body: new FormData() }), ApiError);
  assert.throws(() => metadataHeaders({ method: 'GET', body: '{}' }), ApiError);
  assert.equal(rejectsAuthorityHeaders(new Headers({ 'x-current-user': 'forged' })), true);
  assert.equal(rejectsAuthorityHeaders(new Headers({ 'x-csrf-token': 'nonce' })), false);
  const empty = new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } });
  assert.equal(await requestMetadata(new Request('https://fixture.test/api/backend/laws/1', {
    method: 'DELETE', body: empty, duplex: 'half',
  } as RequestInit)), undefined);
});
test('raw fetch never buffers/follows redirects and decoded empty responses are void', async () => {
  let calls = 0;
  const raw = new Response('stream', { status: 302, headers: { location: 'https://download.fixture.test/' } });
  globalThis.fetch = async (_url, init) => {
    calls++; assert.equal(init?.redirect, 'manual'); assert.equal(init?.cache, 'no-store'); assert.equal(init?.credentials, 'omit'); return raw;
  };
  assert.equal(await nativeRequest('https://fixture.test/api/x', {}, 'omit', async r => r), raw);
  assert.equal(raw.bodyUsed, false); assert.equal(calls, 1);
  assert.equal(await decodeResponse(new Response(null, { status: 204 })), undefined);
  await assert.rejects(decodeResponse(new Response('{')), error => error instanceof ApiError && error.kind === 'invalid_response');
});
test('abort and timeout remain typed through JSON reads, clean up and never retry', async () => {
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    return new Response(new ReadableStream({ start(controller) {
      init!.signal!.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
    } }));
  };
  await assert.rejects(nativeRequest('https://fixture.test/api/x', { timeoutMs: 5 }, 'omit', decodeResponse), error => error instanceof ApiError && error.kind === 'timeout');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(nativeRequest('https://fixture.test/api/x', { signal: controller.signal }, 'omit', decodeResponse), error => error instanceof ApiError && error.kind === 'aborted');
  assert.equal(calls, 1);
});
