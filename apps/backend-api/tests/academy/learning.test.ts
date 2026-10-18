import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { CAPABILITY } from '@pharmacy/contracts/access';
import type { AcademyLearningState } from '@pharmacy/contracts/academy';
import { authorizeAcademyAssetRead, createLearningService } from '../../src/modules/academy';
import { academyFixture, academyMember } from '../helpers/academy-fixture';

const examText = 'Final?\n- no\n- yes*';
const quizText = 'Ready?\n- no\n- yes*';

test('progress is 80 before a passing exam and 100 after, with a unique certificate', async () => {
  const f = await academyFixture();
  try {
    const saved = await f.app.inject({
      method: 'PUT', url: `/academy/admin/courses/${f.publishedId}`,
      headers: f.staffHeaders(),
      payload: {
        title: 'Published fixture',
        status: 'published',
        examText,
        lessons: [{ title: 'Only lesson', quizText }],
      },
    });
    assert.equal(saved.statusCode, 200, saved.body);
    const enroll = await f.app.inject({
      method: 'POST', url: '/academy/member/enroll',
      headers: f.memberHeaders(),
      payload: { courseId: f.publishedId, pharmacistLicense: '11111', displayName: 'Fixture' },
    });
    assert.equal(enroll.statusCode, 200, enroll.body);

    const lessonId = Number((await f.db.query(
      `SELECT id FROM academy_lessons WHERE course_id=$1`, [f.publishedId],
    )).rows[0]!.id);

    const incompleteExam = await f.app.inject({
      method: 'POST', url: `/academy/member/courses/${f.publishedId}/exam`,
      headers: f.memberHeaders(),
      payload: { pharmacistLicense: '11111', answers: ['yes'] },
    });
    assert.equal(incompleteExam.statusCode, 400, incompleteExam.body);

    const wrongLesson = await f.app.inject({
      method: 'POST', url: `/academy/member/lessons/${lessonId}/complete`,
      headers: f.memberHeaders(),
      payload: { pharmacistLicense: '11111', answers: ['no'] },
    });
    assert.equal(wrongLesson.statusCode, 400, wrongLesson.body);

    const completed = await f.app.inject({
      method: 'POST', url: `/academy/member/lessons/${lessonId}/complete`,
      headers: f.memberHeaders(),
      payload: { pharmacistLicense: '11111', answers: ['yes'] },
    });
    assert.equal(completed.statusCode, 200, completed.body);
    assert.equal(completed.json().progressPercent, 80);

    const learning = await f.app.inject({
      url: `/academy/member/courses/${f.publishedId}/learning?license=11111`,
      headers: f.memberHeaders(),
    });
    assert.equal(learning.statusCode, 200, learning.body);
    assert.equal(learning.headers['cache-control'], 'no-store');
    const state = learning.json() as AcademyLearningState;
    assert.equal(state.progressPercent, 80);
    assert.equal(state.examPassed, false);
    assert.equal(state.exam[0]?.question, 'Final?');
    assert.equal(JSON.stringify(state).includes('yes*') || JSON.stringify(state).includes('"answer"'), false);

    const wrongExam = await f.app.inject({
      method: 'POST', url: `/academy/member/courses/${f.publishedId}/exam`,
      headers: f.memberHeaders(),
      payload: { pharmacistLicense: '11111', answers: ['no'] },
    });
    assert.equal(wrongExam.statusCode, 400, wrongExam.body);
    assert.equal(Number((await f.db.query(
      `SELECT progress_percent FROM academy_enrollments WHERE course_id=$1 AND pharmacist_license='11111'`,
      [f.publishedId],
    )).rows[0]!.progress_percent), 80);

    const passed = await f.app.inject({
      method: 'POST', url: `/academy/member/courses/${f.publishedId}/exam`,
      headers: f.memberHeaders(),
      payload: { pharmacistLicense: '11111', answers: ['yes'] },
    });
    assert.equal(passed.statusCode, 200, passed.body);
    assert.equal(passed.json().progressPercent, 100);

    const first = await f.app.inject({
      url: `/academy/member/courses/${f.publishedId}/certificate?license=11111`,
      headers: f.memberHeaders(),
    });
    const second = await f.app.inject({
      url: `/academy/member/courses/${f.publishedId}/certificate?license=11111`,
      headers: f.memberHeaders(),
    });
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(second.statusCode, 200, second.body);
    assert.equal(first.json().code, second.json().code);
    assert.equal(Number((await f.db.query(
      `SELECT count(*)::int AS n FROM academy_certificates`,
    )).rows[0]!.n), 1);
    assert.equal(first.headers['cache-control'], 'no-store');
  } finally { await f.cleanup(); }
});

test('private lesson documents and slips deny non-enrolled and foreign members', async () => {
  const f = await academyFixture();
  try {
    const lessonId = Number((await f.db.query(
      `INSERT INTO academy_lessons(course_id,title,sort_order) VALUES($1,'Doc lesson',0) RETURNING id`,
      [f.publishedId],
    )).rows[0]!.id);
    const documentId = randomUUID();
    const slipId = randomUUID();
    await f.db.query(
      `INSERT INTO media_assets(id,owner_domain,owner_type,owner_id,owner_slot,kind,visibility,filename,mime,byte_size,object_key)
       VALUES($1,'academy','lesson',$2,'document','academy-document','private','a.pdf','application/pdf',8,'academy/doc'),
             ($3,'academy','order','9','slip','academy-slip','private','s.jpg','image/jpeg',8,'academy/slip')`,
      [documentId, String(lessonId), slipId],
    );
    await f.db.query(
      `INSERT INTO academy_orders(id,course_id,pharmacist_license,display_name,amount,status)
       VALUES(9,$1,'11111','Fixture','10','paid')`,
      [f.publishedId],
    );
    const staff = {
      id: f.staff.id, username: f.staff.username, displayName: 'Fake Staff', role: 'academy_editor',
      permissions: [CAPABILITY.MANAGE_ACADEMY], sessionId: 's',
    };
    const other = { ...academyMember, subject: '22222', pharmacistLicense: '22222', displayName: 'Other' };
    await assert.rejects(() => authorizeAcademyAssetRead(f.db, academyMember, documentId), (error: Error & { statusCode?: number }) => error.statusCode === 403);
    await f.app.inject({
      method: 'POST', url: '/academy/member/enroll',
      headers: f.memberHeaders(),
      payload: { courseId: f.publishedId, pharmacistLicense: '11111', displayName: 'Fixture' },
    });
    const enrolled = await authorizeAcademyAssetRead(f.db, academyMember, documentId);
    assert.equal(enrolled.actorKey, 'pharmacy-mock:11111');
    await assert.rejects(() => authorizeAcademyAssetRead(f.db, other, documentId), (error: Error & { statusCode?: number }) => error.statusCode === 403);
    await assert.rejects(() => authorizeAcademyAssetRead(f.db, other, slipId), (error: Error & { statusCode?: number }) => error.statusCode === 403);
    const ownSlip = await authorizeAcademyAssetRead(f.db, academyMember, slipId);
    assert.equal(ownSlip.actorKey, 'pharmacy-mock:11111');
    const staffRead = await authorizeAcademyAssetRead(f.db, staff, documentId);
    assert.equal(staffRead.actorKey, `staff:${f.staff.id}`);

    const hidden = await createLearningService({
      db: f.db, config: f.config, clock: f.clock,
      access: { requireCapability: () => async () => undefined, resolveStaffActor: async () => { throw new Error('unused'); } },
    }).getLearning(other, f.publishedId);
    assert.equal(hidden.enrolled, false);
    assert.equal(hidden.lessons[0]?.videoUrl, null);
    assert.equal(hidden.lessons[0]?.documents.length, 0);
  } finally { await f.cleanup(); }
});
