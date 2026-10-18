import assert from 'node:assert/strict';
import test from 'node:test';
import type { Database } from '../../src/db/client';
import { countActiveEnrollments, countPaidOrders, createCourseService, createOrderService } from '../../src/modules/academy';
import type { MediaLifecycle } from '../../src/modules/media';
import { academyFixture, academyMember } from '../helpers/academy-fixture';
import { accessFixture } from '../fixtures/access';

const unusedAccess = {
  requireCapability: () => async () => undefined,
  resolveStaffActor: async () => { throw new Error('unused'); },
};

function failAfter(db: Database, pattern: RegExp): Database {
  return {
    query: (sql, values) => db.query(sql, values),
    withTransaction: work => db.withTransaction(async tx => {
      const query = tx.query.bind(tx);
      return work({
        query: async (sql, values) => {
          const result = await query(sql, values);
          if (pattern.test(sql)) throw new Error('injected-constraint');
          return result;
        },
      });
    }),
    close: () => db.close(),
  };
}

function trackingMedia() {
  const releaseCalls: unknown[] = [];
  const media = {
    reserveAttach: async () => ({ id: 'r', owner: { domain: 'academy', type: 'course', id: '1', slot: 'cover' }, assetIds: [] }),
    confirmAttach: async () => undefined,
    release: async (...args: unknown[]) => { releaseCalls.push(args); },
    reconcileMedia: async () => ({ retained: 0, deleted: 0, retry: 0 }),
  } as unknown as MediaLifecycle;
  return { media, releaseCalls };
}

test('injected order failure leaves no paid order or enrollment; concurrent same key pays once', async () => {
  const fixture = await accessFixture();
  try {
    const paid = Number((await fixture.db.query(
      `INSERT INTO academy_courses(title,status,price,format,audience,is_featured,published_at)
       VALUES('Paid fixture','published','100','online','all',false,$1) RETURNING id`,
      [fixture.clock()],
    )).rows[0]!.id);
    const failedDb = failAfter(fixture.db, /INSERT INTO academy_orders/);
    const orders = createOrderService({
      db: failedDb, config: fixture.config, clock: fixture.clock, access: unusedAccess,
    });
    await assert.rejects(
      () => orders.placeMockOrder(academyMember, paid, 'pay-rollback'),
      /injected-constraint/,
    );
    assert.equal(await countPaidOrders(fixture.db, '11111', paid), 0);
    assert.equal(await countActiveEnrollments(fixture.db, '11111', paid), 0);
    assert.equal(Number((await fixture.db.query('SELECT count(*)::int AS n FROM academy_commands')).rows[0]!.n), 0);
  } finally { await fixture.cleanup(); }

  const f = await academyFixture();
  try {
    const paidId = Number((await f.db.query(
      `INSERT INTO academy_courses(title,status,price,format,audience,is_featured,published_at)
       VALUES('Paid concurrent','published','250','online','all',false,$1) RETURNING id`,
      [f.clock()],
    )).rows[0]!.id);
    const payload = { courseId: paidId, pharmacistLicense: '11111', displayName: 'Fixture', subject: '11111' };
    const [first, second] = await Promise.all([
      f.app.inject({ method: 'POST', url: '/academy/member/orders', headers: f.memberHeaders('pay-same'), payload }),
      f.app.inject({ method: 'POST', url: '/academy/member/orders', headers: f.memberHeaders('pay-same'), payload }),
    ]);
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(second.statusCode, 200, second.body);
    assert.deepEqual(first.json(), second.json());
    assert.equal(await f.countPaidOrders('11111', paidId), 1);
    assert.equal(await f.countActiveEnrollments('11111', paidId), 1);

    const replay = await f.app.inject({
      method: 'POST', url: '/academy/member/orders', headers: f.memberHeaders('pay-same'), payload,
    });
    assert.equal(replay.statusCode, 200, replay.body);
    assert.deepEqual(replay.json(), first.json());

    const conflict = await f.app.inject({
      method: 'POST', url: '/academy/member/orders', headers: f.memberHeaders('pay-same'),
      payload: { ...payload, courseId: f.publishedId },
    });
    assert.equal(conflict.statusCode, 409, conflict.body);
    assert.equal(await f.countPaidOrders('11111', paidId), 1);
  } finally { await f.cleanup(); }
});

test('foreign nested lesson IDs roll back the other course and never release media', async () => {
  const f = await academyFixture();
  try {
    const otherId = Number((await f.db.query(
      `INSERT INTO academy_courses(title,status,price,format,audience,is_featured,published_at)
       VALUES('Other published','published','0','online','all',false,$1) RETURNING id`,
      [f.clock()],
    )).rows[0]!.id);
    const otherLesson = Number((await f.db.query(
      `INSERT INTO academy_lessons(course_id,title,sort_order) VALUES($1,'Keep me',0) RETURNING id`,
      [otherId],
    )).rows[0]!.id);
    const otherBefore = await f.readCourse(otherId);
    const { media, releaseCalls } = trackingMedia();
    const courses = createCourseService({
      db: f.db, config: f.config, clock: f.clock, access: unusedAccess, media,
    });
    await assert.rejects(
      () => courses.saveCourse(f.staff as never, f.publishedId, {
        title: 'Hijack',
        lessons: [{ id: otherLesson, title: 'Stolen' }],
      }),
      (error: Error & { statusCode?: number }) => error.statusCode === 400,
    );
    assert.deepEqual(await f.readCourse(otherId), otherBefore);
    assert.equal((await f.db.query('SELECT title FROM academy_lessons WHERE id=$1', [otherLesson])).rows[0]?.title, 'Keep me');
    assert.equal(releaseCalls.length, 0);

    const failedDb = failAfter(f.db, /INSERT INTO academy_course_outcomes/);
    const rolling = createCourseService({
      db: failedDb, config: f.config, clock: f.clock, access: unusedAccess, media,
    });
    const before = await f.readCourse(f.publishedId);
    await assert.rejects(
      () => rolling.saveCourse(f.staff as never, f.publishedId, {
        title: 'Should rollback',
        outcomes: ['new outcome'],
      }),
      /injected-constraint/,
    );
    assert.deepEqual(await f.readCourse(f.publishedId), before);
    assert.equal(releaseCalls.length, 0);
  } finally { await f.cleanup(); }
});

test('mock refund cancels enrollment atomically and replays the same command', async () => {
  const f = await academyFixture();
  try {
    const paidId = Number((await f.db.query(
      `INSERT INTO academy_courses(title,status,price,format,audience,is_featured,published_at)
       VALUES('Refundable','published','80','online','all',false,$1) RETURNING id`,
      [f.clock()],
    )).rows[0]!.id);
    const payload = { courseId: paidId, pharmacistLicense: '11111', displayName: 'Fixture' };
    const paid = await f.app.inject({
      method: 'POST', url: '/academy/member/orders', headers: f.memberHeaders('refund-pay'), payload,
    });
    assert.equal(paid.statusCode, 200, paid.body);
    assert.equal(await f.countPaidOrders('11111', paidId), 1);
    assert.equal(await f.countActiveEnrollments('11111', paidId), 1);

    const refundPayload = { pharmacistLicense: '11111', reason: 'เปลี่ยนใจ' };
    const refunded = await f.app.inject({
      method: 'POST', url: `/academy/member/courses/${paidId}/refund`,
      headers: f.memberHeaders('refund-same'), payload: refundPayload,
    });
    assert.equal(refunded.statusCode, 200, refunded.body);
    assert.equal(await f.countPaidOrders('11111', paidId), 0);
    assert.equal(await f.countActiveEnrollments('11111', paidId), 0);
    assert.equal((await f.db.query(
      `SELECT status FROM academy_orders WHERE course_id=$1 AND pharmacist_license='11111'`, [paidId],
    )).rows[0]?.status, 'refunded');

    const replay = await f.app.inject({
      method: 'POST', url: `/academy/member/courses/${paidId}/refund`,
      headers: f.memberHeaders('refund-same'), payload: refundPayload,
    });
    assert.equal(replay.statusCode, 200, replay.body);
    assert.deepEqual(replay.json(), refunded.json());
    assert.equal(Number((await f.db.query(
      `SELECT count(*)::int AS n FROM academy_refund_requests`,
    )).rows[0]!.n), 1);
  } finally { await f.cleanup(); }
});
