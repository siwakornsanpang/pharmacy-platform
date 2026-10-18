import assert from 'node:assert/strict';
import test from 'node:test';
import Ajv from 'ajv';
import * as media from '../src/media.js';

const ajv = new Ajv({ strict: true });
const owner = { domain: 'registry', type: 'pharmacist', id: '1', slot: 'photo' };
const staged = { id: '11111111-1111-4111-8111-111111111111', owner, kind: 'website-image', visibility: 'public' };

test('Media public contracts include registry owners and omit storage authority', () => {
  assert.deepEqual([...media.assetDomains], ['content', 'requests', 'academy', 'registry']);
  assert.equal(ajv.validate(media.StagedAssetSchema, staged), true);
  assert.equal(ajv.validate(media.StagedAssetSchema, { ...staged, bucket: 'uploads' }), false);
  assert.equal(ajv.validate(media.StagedAssetSchema, { ...staged, objectPath: 'secret' }), false);
  assert.equal(ajv.validate(media.StagedAssetSchema, { ...staged, owner: { ...owner, domain: 'users' } }), false);
  assert.equal(typeof (media as { VerifiedUploadActor?: unknown }).VerifiedUploadActor, 'undefined');
});

test('Upload intents and signed downloads are closed public DTOs', () => {
  const intent = {
    id: staged.id, uploadUrl: 'https://upload.example.test/api/media/uploads/' + staged.id,
    ticket: 'a'.repeat(64), expiresAt: '2026-10-15T12:05:00.000Z',
  };
  assert.equal(ajv.validate(media.UploadIntentSchema, intent), true);
  assert.equal(ajv.validate(media.UploadIntentSchema, { ...intent, actorKey: 'staff:1' }), false);
  assert.equal(ajv.validate(media.SignedDownloadSchema, {
    url: 'https://storage.example.test/signed/a', expiresAt: '2026-10-15T12:05:00.000Z',
  }), true);
  assert.equal(ajv.validate(media.UploadIntentMetadataSchema, {
    filename: 'รูป.jpeg', declaredMime: 'image/jpeg', size: 12,
  }), true);
});
