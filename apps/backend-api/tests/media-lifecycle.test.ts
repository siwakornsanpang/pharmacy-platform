import assert from 'node:assert/strict';
import test from 'node:test';
import { writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { createMediaAuthorizers, createMediaService, createMediaLifecycle } from '../src/modules/media';
import { parseOwner } from '../src/modules/media/policy';
import { claimDraftContentAssets, commitContentAssets, createContentMediaPort, publicContentAssetUrl } from '../src/modules/content/media';
import { createRequestMediaPort } from '../src/modules/requests/media';
import { accessFixture } from './fixtures/access';
import { fakeStorage, jpegBytes, mediaTableDdl } from './fixtures/storage';

const owner = { domain: 'content' as const, type: 'news', id: '1', slot: 'cover' };
const body = { ...owner, slot: 'body' };

async function setup() {
  const fixture = await accessFixture();
  try {
    await fixture.db.query(mediaTableDdl);
    const storage = fakeStorage();
    let now = fixture.clock();
    const clock = () => now;
    const authorizers = createMediaAuthorizers({
      getPhotoOwnerReference: async () => ({ ownerId: 1, ownerExists: true, storedReference: null, authorized: true }),
    });
    const media = createMediaService({ db: fixture.db, config: fixture.config, clock, storage, authorizers });
    const actor = {
      kind: 'staff' as const, actorKey: 'staff:1', userId: 1, sessionId: 's',
      requiredCapability: CAPABILITY.MANAGE_NEWS,
    };
    const ownerPorts = {
      content: createContentMediaPort(fixture.db),
      requests: createRequestMediaPort(fixture.db),
    };
    const lifecycle = createMediaLifecycle({ db: fixture.db, clock, storage, ownerPorts });
    async function stage(target = owner) {
      const jpeg = jpegBytes();
      const path = join(tmpdir(), `pharmacy-life-${randomUUID()}`);
      await writeFile(path, jpeg);
      try {
        return await media.stageUpload({
          owner: target, kind: 'website-image', filename: 'a.jpg', declaredMime: 'image/jpeg',
          path, sniff: jpeg.subarray(0, 16), size: jpeg.length, actor,
        });
      } finally { await rm(path, { force: true }); }
    }
    async function objectKey(id: string) {
      return (await fixture.db.query('SELECT object_key FROM media_assets WHERE id=$1', [id])).rows[0]?.object_key as string | undefined;
    }
    const exists = (key?: string) => Boolean(key) && !storage.deletes.includes(key!);
    return {
      ...fixture, storage, media, lifecycle, actor, ownerPorts,
      clock: { now: () => now, set(value: Date) { now = value; } },
      stage, objectKey, exists,
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

test('failed storage and confirm paths retain bytes; shared and unavailable owners never delete', async () => {
  const f = await setup();
  try {
    const oldAsset = await f.stage();
    await f.lifecycle.reserveAttach(owner, [oldAsset.id]);
    await f.lifecycle.confirmAttach(owner, [oldAsset.id]);
    await f.db.query(
      `INSERT INTO content_asset_refs(owner_type,owner_id,owner_slot,asset_id) VALUES($1,$2,$3,$4)`,
      [owner.type, owner.id, owner.slot, oldAsset.id],
    );
    const newAsset = await f.stage();
    await f.lifecycle.reserveAttach(owner, [newAsset.id]);
    const failedWrite = await commitContentAssets({
      db: f.db, media: f.lifecycle, owner, attachAssetIds: [newAsset.id], releaseAssetIds: [oldAsset.id],
      write: async () => { throw new Error('domain-write-failed'); },
    });
    const failedReferenceCommit = {
      oldObjectExists: f.exists(await f.objectKey(oldAsset.id)),
    };
    assert.equal(failedWrite.failedReferenceCommit, true);
    assert.equal(failedReferenceCommit.oldObjectExists, true);

    const originalTx = f.db.withTransaction.bind(f.db);
    f.db.withTransaction = (async <T>(work: Parameters<typeof f.db.withTransaction<T>>[0]) =>
      originalTx(async tx => {
        const query = tx.query.bind(tx);
        return work({
          query: async (sql, values) => {
            if (/INSERT INTO media_asset_references/.test(sql)) throw new Error('confirm-fail');
            return query(sql, values);
          },
        });
      })) as typeof f.db.withTransaction;
    const confirmLifecycle = createMediaLifecycle({
      db: f.db, clock: () => f.clock.now(), storage: f.storage, ownerPorts: f.ownerPorts,
    });
    await confirmLifecycle.reserveAttach(owner, [newAsset.id]);
    await assert.rejects(() => confirmLifecycle.confirmAttach(owner, [newAsset.id]));
    f.db.withTransaction = originalTx;
    const confirmFailure = {
      newObjectExists: f.exists(await f.objectKey(newAsset.id)),
      retryRows: Number((await f.db.query(
        `SELECT count(*)::int AS n FROM media_cleanup_jobs WHERE reason='confirm-failure'`,
      )).rows[0]!.n),
    };
    assert.equal(confirmFailure.newObjectExists, true);
    assert.equal(confirmFailure.retryRows, 1);

    const shared = await f.stage();
    await f.lifecycle.reserveAttach(owner, [shared.id]);
    await f.lifecycle.confirmAttach(owner, [shared.id]);
    await f.lifecycle.reserveAttach(body, [shared.id]);
    await f.lifecycle.confirmAttach(body, [shared.id]);
    await f.db.query(
      `INSERT INTO content_asset_refs(owner_type,owner_id,owner_slot,asset_id) VALUES($1,$2,$3,$4),($1,$2,$5,$4)`,
      [owner.type, owner.id, owner.slot, shared.id, body.slot],
    );
    await f.lifecycle.release(owner, [shared.id]);
    const sharedAsset = { deleted: !f.exists(await f.objectKey(shared.id)) };
    assert.equal(sharedAsset.deleted, false);

    const orphan = await f.stage();
    f.storage.delete = async () => { throw new Error('storage-down'); };
    await f.lifecycle.reserveAttach(owner, [orphan.id]);
    await f.lifecycle.confirmAttach(owner, [orphan.id]);
    await f.lifecycle.release(owner, [orphan.id]);
    assert.equal(f.exists(await f.objectKey(orphan.id)), true);
    const down = createMediaLifecycle({
      db: f.db, clock: () => f.clock.now(), storage: f.storage,
      ownerPorts: { content: { isReferenced: async () => { throw new Error('owner-lookup-down'); } } },
    });
    const first = await down.reconcileMedia({ dryRun: false, writersFrozen: true });
    const second = await down.reconcileMedia({ dryRun: false, writersFrozen: true });
    const unavailableOwnerLookup = { deletedCount: first.deleted };
    assert.equal(unavailableOwnerLookup.deletedCount, 0);
    assert.deepEqual({ retained: second.retained, deleted: second.deleted, retry: second.retry }, {
      retained: first.retained, deleted: first.deleted, retry: first.retry,
    });
    f.clock.set(new Date(f.clock.now().getTime() + 8 * 24 * 60 * 60 * 1000));
    await f.lifecycle.reconcileMedia({ dryRun: false, writersFrozen: true });
    assert.equal((await f.db.query(
      `SELECT count(*)::int AS n FROM media_asset_pins WHERE asset_id=$1 AND state='pending'`,
      [newAsset.id],
    )).rows[0]!.n, 1);
  } finally { await f.cleanup(); }
});

test('reservation_vs_release_never_deletes_pending_attachment', async () => {
  const f = await setup();
  try {
    const pendingAsset = await f.stage();
    await f.lifecycle.reserveAttach(owner, [pendingAsset.id]);
    await f.lifecycle.release(owner, [pendingAsset.id]);
    assert.equal(f.exists(await f.objectKey(pendingAsset.id)), true);
    assert.equal((await f.db.query(
      `SELECT state FROM media_asset_pins WHERE asset_id=$1`, [pendingAsset.id],
    )).rows[0]?.state, 'pending');
    f.clock.set(new Date(f.clock.now().getTime() + 10 * 24 * 60 * 60 * 1000));
    await f.lifecycle.reconcileMedia({ dryRun: true, writersFrozen: false });
    assert.equal(f.exists(await f.objectKey(pendingAsset.id)), true);

    const doomed = await f.stage();
    await f.lifecycle.confirmAttach(owner, [doomed.id]);
    await f.lifecycle.release(owner, [doomed.id]);
    await assert.rejects(
      () => f.lifecycle.reserveAttach(owner, [doomed.id]),
      (error: { statusCode?: number }) => error.statusCode === 409,
    );
    await assert.rejects(
      () => Promise.resolve().then(() => parseOwner({ ...owner, slot: 'unknown' })),
      (error: { statusCode?: number }) => error.statusCode === 400,
    );
    await assert.rejects(
      () => f.lifecycle.release({ ...owner, id: '999' }, [pendingAsset.id]),
      (error: { statusCode?: number }) => error.statusCode === 403,
    );
  } finally { await f.cleanup(); }
});

test('public content asset URLs stay inside configured public-media sources', () => {
  const assetId = '11111111-1111-4111-8111-111111111111';
  const origin = 'https://media.example.test';
  assert.equal(
    publicContentAssetUrl({
      supabaseUrl: origin,
      contentImageSources: [{ origin, pathPrefix: '/storage/v1/object/public/public-media/' }],
      assetId,
    }),
    `${origin}/storage/v1/object/public/public-media/assets/${assetId}`,
  );
  assert.equal(
    publicContentAssetUrl({
      supabaseUrl: origin,
      contentImageSources: [{ origin, pathPrefix: '/storage/v1/object/public/uploads/' }],
      assetId,
    }),
    null,
  );
});

test('draft staff news uploads attach to the saved article instead of 403', async () => {
  const f = await setup();
  try {
    const draft = { domain: 'content' as const, type: 'news', id: 'staff:1', slot: 'draft' };
    const asset = await f.stage(draft);
    await assert.rejects(
      () => f.lifecycle.reserveAttach(owner, [asset.id]),
      (error: { statusCode?: number }) => error.statusCode === 403,
    );
    await claimDraftContentAssets({
      db: f.db, family: 'news', staffId: 1, entityId: '1', slot: 'cover', assetIds: [asset.id],
    });
    await f.lifecycle.reserveAttach(owner, [asset.id]);
    const owned = (await f.db.query(
      'SELECT owner_id, owner_slot FROM media_assets WHERE id=$1', [asset.id],
    )).rows[0];
    assert.equal(owned?.owner_id, '1');
    assert.equal(owned?.owner_slot, 'cover');
    const foreign = await f.stage({ ...draft, id: 'staff:2' });
    await assert.rejects(
      () => claimDraftContentAssets({
        db: f.db, family: 'news', staffId: 1, entityId: '1', slot: 'cover', assetIds: [foreign.id],
      }),
      (error: { statusCode?: number }) => error.statusCode === 403,
    );
  } finally { await f.cleanup(); }
});
