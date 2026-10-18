import assert from 'node:assert/strict';
import test from 'node:test';
import type { AcademyCourse } from '@pharmacy/contracts/academy';
import { academyFixture } from '../helpers/academy-fixture';

test('published catalog hides drafts and unauthenticated admin/member reads are 401', async () => {
  const f = await academyFixture();
  try {
    const listed = await f.app.inject({ url: '/academy/courses' });
    assert.equal(listed.statusCode, 200, listed.body);
    assert.equal(listed.headers['cache-control'], 'no-store');
    const courses = listed.json() as AcademyCourse[];
    assert.equal(courses.some(course => course.id === f.draftId), false);
    assert.equal(courses.some(course => course.id === f.publishedId), true);
    assert.equal(courses.find(course => course.id === f.publishedId)?.title, 'Published fixture');

    assert.equal((await f.app.inject({ url: '/academy/admin/courses' })).statusCode, 401);
    assert.equal((await f.app.inject({ url: '/academy/member/enrollments?license=11111' })).statusCode, 401);

    const forgedBridge = await f.app.inject({
      url: '/academy/member/enrollments?license=11111',
      headers: { 'x-academy-bridge': 'forged' },
    });
    assert.equal(forgedBridge.statusCode, 401);

    const detail = await f.app.inject({ url: `/academy/courses/${f.draftId}` });
    assert.equal(detail.statusCode, 404);
  } finally { await f.cleanup(); }
});
