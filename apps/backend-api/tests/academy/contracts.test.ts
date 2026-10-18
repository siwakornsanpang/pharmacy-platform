import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import type { AcademyCourse } from '@pharmacy/contracts/academy';
import * as academy from '@pharmacy/contracts/academy';
import { UploadIntentMetadataSchema } from '@pharmacy/contracts/media';

const ajv = new Ajv({ strict: true });
const course: AcademyCourse = {
  id: 1, title: 'Published', summary: null, coverUrl: null, durationLabel: null, cpeLabel: '0 หน่วยกิต',
  categoryName: null, categoryColor: null, instructorName: null, instructorTitle: null,
  studentCount: 0, rating: null, reviewCount: 0, outcomes: [], isFeatured: false,
  format: 'online', venue: null, trainingStartsAt: null, trainingEndsAt: null,
};

test('Academy contracts export frozen public DTOs and media upload aliases without actor fields', () => {
  assert.equal(ajv.validate(academy.AcademyCourseSchema, course), true);
  assert.equal(ajv.validate(academy.AcademyCourseSchema, { ...course, exam: [] }), false);
  assert.equal(ajv.validate(academy.AcademyCourseDetailSchema, {
    ...course, cpeCredits: '0', conferenceCode: null, price: '0', audience: 'all',
    instructorExpertise: null, instructorImageUrl: null, lessons: [{ id: 1, title: 'L', description: null }],
  }), true);
  assert.equal(academy.AcademyUploadIntentMetadataSchema, UploadIntentMetadataSchema);
  assert.equal(ajv.validate(academy.AcademyUploadIntentMetadataSchema, {
    filename: 'slip.jpg', declaredMime: 'image/jpeg', size: 12, actor: 'staff',
  }), false);
  assert.equal(ajv.validate(academy.AcademyMemberActorSchema, {
    kind: 'pharmacy-mock', subject: '11111', pharmacistLicense: '11111', displayName: 'Fixture',
  }), true);
  const source = readFileSync(resolve(__dirname, '../../../../packages/contracts/src/academy.ts'), 'utf8');
  assert.equal(/drizzle-orm|from 'pg'|fastify|DATABASE_URL/.test(source), false);
});
