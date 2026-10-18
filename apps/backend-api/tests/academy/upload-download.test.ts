import assert from 'node:assert/strict';
import test from 'node:test';
import { jpegBytes } from '../fixtures/storage';
import { academyFixture } from '../helpers/academy-fixture';

test('member slip intents upload once and private downloads redirect without a second storage write', async () => {
  const f = await academyFixture();
  try {
    const jpeg = jpegBytes(8_388_608);
    const created = await f.app.inject({
      method: 'POST', url: '/academy/member/upload',
      headers: f.memberHeaders(),
      payload: {
        filename: 'slip.jpg', declaredMime: 'image/jpeg', size: jpeg.length,
        pharmacistLicense: '11111', displayName: 'Fixture', subject: '11111',
      },
    });
    assert.equal(created.statusCode, 200, created.body);
    const intent = created.json() as { id: string; ticket: string; uploadUrl: string };
    assert.match(intent.uploadUrl, /^https:\/\/upload\.example\.test\/api\/media\/uploads\//);
    assert.equal(f.storage.uploads.length, 0);

    const headers = {
      'content-type': 'application/octet-stream',
      origin: 'https://web.example.test',
      'x-upload-ticket': intent.ticket,
    };
    const uploaded = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${intent.id}`, headers, payload: jpeg,
    });
    assert.equal(uploaded.statusCode, 200, uploaded.body);
    assert.equal(f.storage.uploads.length, 1);
    assert.equal(f.storage.uploads[0]?.size, 8_388_608);
    const assetId = uploaded.json().id as string;

    const replay = await f.app.inject({
      method: 'POST', url: `/api/media/uploads/${intent.id}`, headers, payload: jpeg,
    });
    assert.equal(replay.statusCode, 409, replay.body);
    assert.equal(f.storage.uploads.length, 1);

    const own = await f.app.inject({
      url: `/academy/member/assets/${assetId}/download?license=11111`,
      headers: f.memberHeaders(),
    });
    assert.equal(own.statusCode, 302, own.body);
    assert.match(String(own.headers.location), /^https:\/\/storage\.example\.test\//);
    assert.equal(own.headers['cache-control'], 'no-store');
    assert.equal(own.body, '');
    assert.equal(f.storage.signs.length, 1);

    const foreign = await f.app.inject({
      url: `/academy/member/assets/${assetId}/download?license=22222`,
      headers: f.memberHeaders(),
    });
    assert.equal(foreign.statusCode, 403, foreign.body);
    assert.equal(foreign.headers.location, undefined);
    assert.equal(f.storage.signs.length, 1);

    const override = await f.app.inject({
      method: 'POST', url: '/academy/member/upload',
      headers: f.memberHeaders(),
      payload: {
        filename: 'slip.jpg', declaredMime: 'image/jpeg', size: 32,
        pharmacistLicense: '11111', displayName: 'Fixture', subject: '11111',
        owner: { domain: 'academy', type: 'course', id: '1', slot: 'cover' },
      },
    });
    assert.equal(override.statusCode, 200, override.body);
    const stored = (await f.db.query(
      'SELECT owner_type, owner_id, owner_slot, kind FROM media_upload_intents WHERE id=$1',
      [override.json().id],
    )).rows[0];
    assert.equal(stored?.owner_type, 'order');
    assert.equal(stored?.owner_id, 'draft:11111');
    assert.equal(stored?.owner_slot, 'slip');
    assert.equal(stored?.kind, 'academy-slip');
  } finally { await f.cleanup(); }
});
