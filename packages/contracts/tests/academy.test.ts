import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import * as academy from '../src/academy.js';
import { UploadIntentMetadataSchema } from '../src/media.js';

const ajv = new Ajv({ strict: true });
const course = {
  id: 1, title: 'Published', summary: null, coverUrl: null, durationLabel: null, cpeLabel: '0 หน่วยกิต',
  categoryName: null, categoryColor: null, instructorName: null, instructorTitle: null,
  studentCount: 0, rating: null, reviewCount: 0, outcomes: [], isFeatured: false,
  format: 'online', venue: null, trainingStartsAt: null, trainingEndsAt: null,
};

test('Academy public contracts omit exam keys and reuse Media intent metadata', () => {
  assert.equal(ajv.validate(academy.AcademyCourseSchema, course), true);
  assert.equal(ajv.validate(academy.AcademyCourseSchema, { ...course, exam: [{ answer: 'secret' }] }), false);
  assert.equal(academy.AcademyUploadIntentMetadataSchema, UploadIntentMetadataSchema);
  assert.equal(ajv.validate(academy.AcademyUploadIntentMetadataSchema, {
    filename: 'a.jpg', declaredMime: 'image/jpeg', size: 8, owner: { domain: 'academy' },
  }), false);
  const source = readFileSync(fileURLToPath(new URL('../src/academy.ts', import.meta.url)), 'utf8');
  assert.equal(/drizzle-orm|from 'pg'|fastify/.test(source), false);
});
