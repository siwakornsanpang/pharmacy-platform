import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { jsonMetadataMaxBytes } from '../src/modules/media';
import { buildApp } from '../src/app';
import { createMediaAuthorizers, createMediaService, createUploadIntentService } from '../src/modules/media';
import { accessFixture, fakePassword, seedStaff } from './fixtures/access';
import { fakeStorage, mediaTableDdl } from './fixtures/storage';

const eightMiB = 8_388_608;
const requestOwner = { domain: 'requests' as const, type: 'request', id: 'req-fixture', slot: 'document' };

function pdfBytes(size: number): Buffer {
  const buffer = Buffer.alloc(size, 0);
  Buffer.from('%PDF-1.4\n').copy(buffer);
  return buffer;
}

async function setup() {
  const fixture = await accessFixture();
  try {
    await fixture.db.query(mediaTableDdl);
    await fixture.db.query("INSERT INTO permissions(key,label) VALUES ('manage_register','Fixture register') ON CONFLICT DO NOTHING");
    const allowed = await seedStaff(fixture.db, 'cache_editor');
    const denied = await seedStaff(fixture.db, 'cache_denied');
    await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('cache_editor','manage_register',true)");
    await fixture.db.query("DELETE FROM role_permissions WHERE role='cache_denied'");
    const storage = fakeStorage();
    let now = fixture.clock();
    const clock = () => now;
    const app = await buildApp({ ...fixture, clock, storage });
    const login = async (staff: { username: string }) => {
      const response = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { username: staff.username, password: fakePassword },
      });
      assert.equal(response.statusCode, 200, response.body);
      return { authorization: `Bearer ${response.json().token}` };
    };
    const headers = await login(allowed);
    const deniedHeaders = await login(denied);
    const sessionId = (await fixture.db.query(
      'SELECT id FROM staff_sessions WHERE user_id=$1 AND revoked_at IS NULL', [allowed.id],
    )).rows[0]!.id as string;
    const authorizers = createMediaAuthorizers({
      getPhotoOwnerReference: async () => ({ ownerId: 1, ownerExists: true, storedReference: null, authorized: true }),
    });
    const media = createMediaService({ db: fixture.db, config: fixture.config, clock, storage, authorizers });
    const uploads = createUploadIntentService({
      db: fixture.db, config: fixture.config, clock, media, authorizers,
      access: { resolveStoredStaffSession: async () => ({
        id: allowed.id, username: allowed.username, displayName: 'Fake Staff', role: 'cache_editor',
        permissions: [CAPABILITY.MANAGE_NEWS, CAPABILITY.MANAGE_REGISTER], sessionId,
      }) },
    });
    const actor = {
      kind: 'staff' as const, actorKey: `staff:${allowed.id}`, userId: allowed.id, sessionId,
      requiredCapability: CAPABILITY.MANAGE_REGISTER,
    };
    return {
      ...fixture, app, storage, headers, deniedHeaders, uploads, actor,
      cleanup: async () => { await app.close(); await fixture.cleanup(); },
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

test('public, staff and member APIs send Cache-Control no-store', async () => {
  const f = await setup();
  try {
    const publicNews = await f.app.inject({ method: 'GET', url: '/api/news' });
    assert.equal(publicNews.statusCode, 200, publicNews.body);
    assert.equal(publicNews.headers['cache-control'], 'no-store');

    const staffNews = await f.app.inject({ method: 'GET', url: '/api/admin/content/news', headers: f.headers });
    assert.equal(staffNews.statusCode, 200, staffNews.body);
    assert.equal(staffNews.headers['cache-control'], 'no-store');

    const stats = await f.app.inject({ method: 'GET', url: '/api/pharmacists/stats' });
    assert.equal(stats.statusCode, 200, stats.body);
    assert.equal(stats.headers['cache-control'], 'no-store');
    assert.equal('citizenId' in stats.json() || 'citizen_id' in stats.json(), false);

    const requests = await f.app.inject({ method: 'GET', url: '/api/admin/registry/requests', headers: f.headers });
    assert.equal(requests.statusCode, 200, requests.body);
    assert.equal(requests.headers['cache-control'], 'no-store');
  } finally { await f.cleanup(); }
});

test('committed writes are visible on the next read and denied writes leave rows unchanged', async () => {
  const f = await setup();
  try {
    const created = await f.app.inject({
      method: 'POST', url: '/api/news', headers: f.headers,
      payload: { title: 'Committed title', content: '<p>body</p>', status: 'draft', category: 'news' },
    });
    assert.equal(created.statusCode, 200, created.body);
    assert.equal(created.headers['cache-control'], 'no-store');
    const id = created.json().data.id as number;
    const afterWrite = await f.app.inject({ method: 'GET', url: `/api/admin/content/news/${id}`, headers: f.headers });
    assert.equal(afterWrite.statusCode, 200, afterWrite.body);
    assert.equal(afterWrite.headers['cache-control'], 'no-store');
    assert.equal(afterWrite.json().title, 'Committed title');

    const denied = await f.app.inject({
      method: 'PUT', url: `/api/news/${id}`, headers: f.deniedHeaders,
      payload: { title: 'Stolen title', content: '<p>tamper</p>' },
    });
    assert.equal(denied.statusCode, 403, denied.body);
    const unchanged = await f.app.inject({ method: 'GET', url: `/api/admin/content/news/${id}`, headers: f.headers });
    assert.equal(unchanged.json().title, 'Committed title');
    assert.equal(unchanged.json().content.includes('tamper'), false);
  } finally { await f.cleanup(); }
});

test('8MiB PDF intent stages locally and private download is a bodyless 302 without live storage', async () => {
  const f = await setup();
  try {
    const oversizedJson = await f.app.inject({
      method: 'POST', url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { username: 'x', password: 'y'.repeat(jsonMetadataMaxBytes) },
    });
    assert.equal(oversizedJson.statusCode, 413);
    assert.equal(jsonMetadataMaxBytes, 4_000_000);

    const pdf = pdfBytes(eightMiB);
    const intent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner: requestOwner, kind: 'request-document',
      metadata: { filename: 'receipt.pdf', declaredMime: 'application/pdf', size: eightMiB },
    });
    const uploaded = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${intent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': intent.ticket, 'content-length': String(eightMiB),
      },
      payload: pdf,
    });
    assert.equal(uploaded.statusCode, 200, uploaded.body);
    assert.equal(f.storage.uploads.length, 1);
    assert.equal(f.storage.uploads[0]?.size, eightMiB);
    assert.equal(f.storage.uploads[0]?.mime, 'application/pdf');
    const assetId = uploaded.json().id as string;

    const denied = await f.app.inject({ method: 'GET', url: `/api/media/${assetId}/download`, headers: f.deniedHeaders });
    assert.equal(denied.statusCode, 403, denied.body);
    assert.equal(f.storage.signs.length, 0);

    const allowed = await f.app.inject({ method: 'GET', url: `/api/media/${assetId}/download`, headers: f.headers });
    assert.equal(allowed.statusCode, 302, allowed.body);
    assert.equal(allowed.headers['cache-control'], 'no-store');
    assert.equal(allowed.body, '');
    assert.equal(String(allowed.headers.location).startsWith('https://storage.example.test/'), true);
    assert.equal(/supabase\.co|onrender\.com/.test(String(allowed.headers.location)), false);
    assert.equal(f.storage.signs.length, 1);
    assert.equal(/supabase\.co|onrender\.com/.test(f.storage.signs[0]!.url), false);
  } finally { await f.cleanup(); }
});
