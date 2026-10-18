import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { AccessError } from '../src/modules/access/guards';
import { buildApp } from '../src/app';
import { createMediaAuthorizers, createMediaService, createUploadIntentService } from '../src/modules/media';
import { accessFixture, fakePassword, seedStaff } from './fixtures/access';
import { fakeStorage, jpegBytes, mediaTableDdl } from './fixtures/storage';

const owner = { domain: 'content' as const, type: 'news', id: '1', slot: 'cover' };

async function setup() {
  const fixture = await accessFixture();
  try {
    await fixture.db.query(mediaTableDdl);
    const allowed = await seedStaff(fixture.db, 'media_editor');
    const other = await seedStaff(fixture.db, 'media_other');
    await fixture.db.query("DELETE FROM role_permissions WHERE role='media_other'");
    const storage = fakeStorage();
    let now = fixture.clock();
    const clock = () => now;
    const app = await buildApp({ ...fixture, clock, storage });
    const login = async (staff: { username: string }) => {
      const response = await app.inject({
        method: 'POST', url: '/api/auth/login', payload: { username: staff.username, password: fakePassword },
      });
      assert.equal(response.statusCode, 200, response.body);
      return { authorization: `Bearer ${response.json().token}`, id: staff === allowed ? allowed.id : other.id };
    };
    const headers = await login(allowed);
    const sessionId = (await fixture.db.query(
      'SELECT id FROM staff_sessions WHERE user_id=$1 AND revoked_at IS NULL', [allowed.id],
    )).rows[0]!.id as string;
    const authorizers = createMediaAuthorizers({
      getPhotoOwnerReference: async () => ({ ownerId: 1, ownerExists: true, storedReference: null, authorized: true }),
    });
    const media = createMediaService({ db: fixture.db, config: fixture.config, clock, storage, authorizers });
    const resolve = async (userId: number, id: string) => {
      const session = (await fixture.db.query(
        'SELECT revoked_at FROM staff_sessions WHERE id=$1 AND user_id=$2', [id, userId],
      )).rows[0];
      if (!session || session.revoked_at) throw new AccessError(401, 'Unauthorized');
      const grants = (await fixture.db.query(
        "SELECT permission_key FROM role_permissions WHERE role=(SELECT role FROM users WHERE id=$1) AND is_active=true",
        [userId],
      )).rows.map(row => row.permission_key);
      if (!grants.includes(CAPABILITY.MANAGE_NEWS)) throw new AccessError(403, 'Forbidden');
      return {
        id: userId, username: 'x', displayName: 'x', role: 'media_editor',
        permissions: grants, sessionId: id,
      };
    };
    const uploads = createUploadIntentService({
      db: fixture.db, config: fixture.config, clock, media, authorizers,
      access: { resolveStoredStaffSession: resolve as never },
    });
    const actor = {
      kind: 'staff' as const, actorKey: `staff:${allowed.id}`, userId: allowed.id, sessionId,
      requiredCapability: CAPABILITY.MANAGE_NEWS,
    };
    return {
      ...fixture, app, storage, headers, uploads, actor, allowed, sessionId,
      clock: { now: () => now, set(value: Date) { now = value; } },
      cleanup: async () => { await app.close(); await fixture.cleanup(); },
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

function post(f: Awaited<ReturnType<typeof setup>>, intent: { id: string; ticket: string }, payload: Buffer, extra: Record<string, string> = {}) {
  return f.app.inject({
    method: 'POST', url: `/api/media/uploads/${intent.id}`,
    headers: {
      'content-type': 'application/octet-stream', origin: 'https://office.example.test',
      'x-upload-ticket': extra.ticket ?? intent.ticket, ...extra,
    },
    payload,
  });
}

test('one-use tickets reject replay, expiry, revocation, length lies and wrong origin', async () => {
  const f = await setup();
  try {
    const jpeg = jpegBytes();
    const intent = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'a.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    const [first, second] = await Promise.all([post(f, intent, jpeg), post(f, intent, jpeg)]);
    const statuses = [first.statusCode, second.statusCode].sort();
    assert.deepEqual(statuses, [200, 409]);
    assert.equal(f.storage.uploads.length, 1);
    assert.equal((await post(f, intent, jpeg)).statusCode, 409);

    const expired = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'b.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    f.clock.set(new Date(f.clock.now().getTime() + 301000));
    assert.equal((await post(f, expired, jpeg)).statusCode, 401);
    f.clock.set(f.clock.now());

    const revoked = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'c.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    await f.db.query('UPDATE staff_sessions SET revoked_at=$1 WHERE id=$2', [f.clock.now(), f.sessionId]);
    assert.equal((await post(f, revoked, jpeg)).statusCode, 401);
    await f.db.query('UPDATE staff_sessions SET revoked_at=NULL WHERE id=$1', [f.sessionId]);

    const roleChanged = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'd.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    await f.db.query("DELETE FROM role_permissions WHERE role='media_editor'");
    assert.equal((await post(f, roleChanged, jpeg)).statusCode, 403);
    await f.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES('media_editor','manage_news',true)");

    const over = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'e.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    assert.equal((await post(f, over, Buffer.concat([jpeg, Buffer.from('x')]), { 'content-length': String(jpeg.length + 1) })).statusCode, 400);
    const under = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'f.jpg', declaredMime: 'image/jpeg', size: jpeg.length + 8 },
    });
    assert.equal((await post(f, under, jpeg)).statusCode, 400);

    const origin = await f.uploads.createUploadIntent({
      verifiedActor: f.actor, owner, kind: 'website-image',
      metadata: { filename: 'g.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    });
    assert.equal((await post(f, origin, jpeg, { origin: 'https://evil.example.test' })).statusCode, 403);
    assert.equal((await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${origin.id}`,
      headers: { 'content-type': 'application/octet-stream', 'x-upload-ticket': origin.ticket },
      payload: jpeg,
    })).statusCode, 403);

    const cors = await f.app.inject({
      method: 'OPTIONS', url: `/api/media/uploads/${origin.id}`,
      headers: {
        origin: 'https://office.example.test',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-upload-ticket',
      },
    });
    assert.equal(cors.statusCode, 204, cors.body);
    assert.match(String(cors.headers['access-control-allow-headers']), /x-upload-ticket/i);
    assert.equal((await f.db.query('SELECT consumed_at FROM media_upload_intents WHERE id=$1', [origin.id])).rows[0]?.consumed_at, null);

    const member = await assert.rejects(() => f.uploads.createUploadIntent({
      verifiedActor: {
        kind: 'pharmacy-mock', actorKey: 'mock:1', subject: '1', pharmacistLicense: 'PHA-1', displayName: 'Mock',
      },
      owner, kind: 'website-image',
      metadata: { filename: 'h.jpg', declaredMime: 'image/jpeg', size: jpeg.length },
    }), (error: { statusCode?: number }) => error.statusCode === 403);
    void member;
  } finally { await f.cleanup(); }
});
