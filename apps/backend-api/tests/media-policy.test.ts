import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { buildApp } from '../src/app';
import { createUploadIntentService } from '../src/modules/media';
import { createMediaAuthorizers, createMediaService } from '../src/modules/media';
import { jsonMetadataMaxBytes } from '../src/modules/media/upload-intents';
import { accessFixture, fakePassword, seedStaff } from './fixtures/access';
import { fakeStorage, jpegBytes, mediaTableDdl, ooxmlBytes, pdfBytes, pngBytes } from './fixtures/storage';

const owner = { domain: 'content' as const, type: 'news', id: '1', slot: 'cover' };

async function setup() {
  const fixture = await accessFixture();
  try {
    await fixture.db.query(mediaTableDdl);
    await fixture.db.query("INSERT INTO pharmacists(name,registration_id,status) VALUES('Photo','PHA-1','active')");
    const allowed = await seedStaff(fixture.db, 'media_editor');
    const denied = await seedStaff(fixture.db, 'media_denied');
    await fixture.db.query("DELETE FROM role_permissions WHERE role='media_denied'");
    const storage = fakeStorage();
    let now = fixture.clock();
    const clock = () => now;
    const config = { ...fixture.config };
    const app = await buildApp({ ...fixture, config, clock, storage });
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
    const registry = { getPhotoOwnerReference: async () => ({ ownerId: 1, ownerExists: true, storedReference: null, authorized: true }) };
    const authorizers = createMediaAuthorizers(registry);
    const media = createMediaService({ db: fixture.db, config, clock, storage, authorizers });
    const uploads = createUploadIntentService({
      db: fixture.db, config, clock, media, authorizers,
      access: { resolveStoredStaffSession: async (userId, id) => {
        if (id !== sessionId) throw new Error('missing session');
        const row = (await fixture.db.query('SELECT role FROM users WHERE id=$1', [userId])).rows[0];
        const grants = (await fixture.db.query(
          'SELECT permission_key FROM role_permissions WHERE role=$1 AND is_active=true', [row!.role],
        )).rows.map(item => item.permission_key as typeof CAPABILITY.MANAGE_NEWS);
        return {
          id: userId, username: allowed.username, displayName: 'Fake Staff', role: row!.role as string,
          permissions: row!.role === 'admin' ? [CAPABILITY.MANAGE_NEWS] : grants.filter(Boolean), sessionId,
        };
      } },
    });
    const actor = {
      kind: 'staff' as const, actorKey: `staff:${allowed.id}`, userId: allowed.id, sessionId,
      requiredCapability: CAPABILITY.MANAGE_NEWS,
    };
    return {
      ...fixture, app, storage, allowed, headers, deniedHeaders, uploads, actor, clock: {
        now: () => now, set(value: Date) { now = value; },
      },
      cleanup: async () => { await app.close(); await fixture.cleanup(); },
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

test('registry pharmacist photos reject uploads', async () => {
  const f = await setup();
  try {
    await assert.rejects(() => f.uploads.createUploadIntent({
      verifiedActor: f.actor,
      owner: { domain: 'registry', type: 'pharmacist', id: '1', slot: 'photo' },
      kind: 'website-image',
      metadata: { filename: 'photo.jpg', declaredMime: 'image/jpeg', size: 16 },
    }), (error: { statusCode?: number }) => error.statusCode === 403);
    assert.equal(f.storage.uploads.length, 0);
  } finally { await f.cleanup(); }
});

test('forged HTML, oversized uploads and foreign owners never reach storage', async () => {
  const f = await setup();
  try {
    await assert.rejects(() => f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'huge.jpg', declaredMime: 'image/jpeg', size: f.config.uploadMaxBytes + 1 },
    }), (error: { statusCode?: number }) => error.statusCode === 413);
    assert.equal(f.storage.uploads.length, 0);

    const hostile = Buffer.from('<html>alert</html>');
    const forged = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'รูป.jpeg', declaredMime: 'image/jpeg', size: hostile.length },
    });
    const html = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${forged.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': forged.ticket,
      },
      payload: hostile,
    });
    assert.equal(html.statusCode, 415, html.body);
    assert.equal(f.storage.uploads.length, 0);

    await assert.rejects(() => f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner: { domain: 'academy', type: 'course', id: '1', slot: 'cover' },
      kind: 'academy-document',
      metadata: { filename: 'a.pdf', declaredMime: 'application/pdf', size: 16 },
    }), (error: { statusCode?: number }) => error.statusCode === 403);
    assert.equal(f.storage.uploads.length, 0);
  } finally { await f.cleanup(); }
});

test('valid image PDF and office fixtures stage without exposing storage paths', async () => {
  const f = await setup();
  try {
    const jpeg = jpegBytes();
    const intent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'รูป.jpeg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    const uploaded = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${intent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': intent.ticket,
      },
      payload: jpeg,
    });
    assert.equal(uploaded.statusCode, 200, uploaded.body);
    const body = uploaded.json();
    assert.equal(body.visibility, 'public');
    assert.equal(body.bucket, undefined);
    assert.equal(body.objectPath, undefined);
    assert.equal(body.objectKey, undefined);
    assert.match(JSON.stringify(body), /website-image/);
    assert.equal(JSON.stringify(body).includes('storage.example.test'), false);
    assert.equal(f.storage.uploads.length, 1);

    const pdfIntent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'public-document',
      metadata: { filename: 'doc.pdf', declaredMime: 'application/pdf', size: pdfBytes().length },
    });
    assert.equal((await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${pdfIntent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': pdfIntent.ticket,
      },
      payload: pdfBytes(),
    })).statusCode, 200);
    const office = ooxmlBytes();
    const officeIntent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'public-document',
      metadata: {
        filename: 'file.docx',
        declaredMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: office.length,
      },
    });
    assert.equal((await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${officeIntent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': officeIntent.ticket,
      },
      payload: office,
    })).statusCode, 200);
    const png = pngBytes();
    const pngIntent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'dup.png', declaredMime: 'image/png', size: png.length },
    });
    assert.equal((await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${pngIntent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': pngIntent.ticket,
      },
      payload: png,
    })).statusCode, 200);
  } finally { await f.cleanup(); }
});

test('private downloads sign for 300s and denials never call the signer', async () => {
  const f = await setup();
  try {
    const jpeg = jpegBytes();
    const intent = await f.uploads.createUploadIntent({
      verifiedActor: { ...f.actor, requiredCapability: CAPABILITY.MANAGE_NEWS },
      owner, kind: 'request-document',
      metadata: { filename: 'slip.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    const uploaded = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${intent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': intent.ticket,
      },
      payload: jpeg,
    });
    assert.equal(uploaded.statusCode, 200, uploaded.body);
    const assetId = uploaded.json().id;
    const denied = await f.app.inject({ method: 'GET', url: `/api/media/${assetId}/download`, headers: f.deniedHeaders });
    assert.equal(denied.statusCode, 403, denied.body);
    assert.equal(f.storage.signs.length, 0);
    const allowed = await f.app.inject({ method: 'GET', url: `/api/media/${assetId}/download`, headers: f.headers });
    assert.equal(allowed.statusCode, 302, allowed.body);
    assert.equal(allowed.headers['cache-control'], 'no-store');
    assert.equal(f.storage.signs.length, 1);
    assert.equal(f.storage.signs[0]!.expiresAt.toISOString(), new Date(f.clock.now().getTime() + 300000).toISOString());
    f.clock.set(new Date(f.clock.now().getTime() + 301000));
    assert.equal(f.storage.signs[0]!.expiresAt.getTime() < f.clock.now().getTime(), true);
  } finally { await f.cleanup(); }
});

test('factory JSON stays at 4MB while raw uploads may exceed that ceiling', async () => {
  const f = await setup();
  try {
    const oversized = await f.app.inject({
      method: 'POST', url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { username: 'x', password: 'y'.repeat(jsonMetadataMaxBytes) },
    });
    assert.equal(oversized.statusCode, 413);
    const size = jsonMetadataMaxBytes + 64;
    const jpeg = jpegBytes(size);
    const intent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'big.jpg', declaredMime: 'image/jpeg', size },
    });
    const uploaded = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${intent.id}`,
      headers: {
        'content-type': 'application/octet-stream', origin: 'https://office.example.test',
        'x-upload-ticket': intent.ticket,
      },
      payload: jpeg,
    });
    assert.equal(uploaded.statusCode, 200, uploaded.body);
    assert.equal(f.storage.uploads[0]?.size, size);
  } finally { await f.cleanup(); }
});
