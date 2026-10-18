import {
  UploadIntentMetadataSchema, UploadIntentSchema,
  type UploadIntent, type UploadIntentMetadata,
} from './media.js';

export type AcademyUploadIntentMetadata = UploadIntentMetadata;
export type AcademyUploadIntent = UploadIntent;
export const AcademyUploadIntentMetadataSchema = UploadIntentMetadataSchema;
export const AcademyUploadIntentSchema = UploadIntentSchema;

export interface AcademyMemberActor {
  kind: 'pharmacy-mock';
  subject: string;
  pharmacistLicense: string;
  displayName: string;
}

export interface AcademyCourse {
  id: number;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  durationLabel: string | null;
  cpeLabel: string;
  categoryName: string | null;
  categoryColor: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  studentCount: number;
  rating: number | null;
  reviewCount: number;
  outcomes: string[];
  isFeatured: boolean;
  format: 'online' | 'onsite';
  venue: string | null;
  trainingStartsAt: string | null;
  trainingEndsAt: string | null;
}

export interface AcademyCourseDetail extends AcademyCourse {
  cpeCredits: string | null;
  conferenceCode: string | null;
  price: string;
  audience: string;
  instructorExpertise: string | null;
  instructorImageUrl: string | null;
  lessons: { id: number; title: string; description: string | null }[];
}

export interface AcademyLearningState {
  enrolled: boolean;
  format: 'online' | 'onsite';
  venue: string | null;
  trainingStartsAt: string | null;
  trainingEndsAt: string | null;
  orderStatus: string | null;
  progressPercent: number;
  price: string;
  hasExam: boolean;
  examPassed: boolean;
  exam: { question: string; options: string[] }[];
  lessons: {
    id: number;
    title: string;
    description: string | null;
    videoUrl: string | null;
    completed: boolean;
    documents: { name: string; fileUrl: string }[];
    quiz: { question: string; options: string[] }[];
  }[];
}

export interface AcademyLessonInput {
  id?: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  quizText?: string;
  documents?: { id?: number; name: string; fileUrl?: string; assetId?: string }[];
}

export interface AcademyCourseInput {
  title: string;
  summary?: string | null;
  categoryId?: number | null;
  instructorId?: number | null;
  coverUrl?: string | null;
  coverAssetId?: string;
  durationLabel?: string | null;
  cpeCredits?: string | null;
  conferenceCode?: string | null;
  price?: string;
  audience?: 'all' | 'general' | 'pharmacist';
  format?: 'online' | 'onsite';
  venue?: string | null;
  trainingStartsAt?: string | null;
  trainingEndsAt?: string | null;
  status?: 'draft' | 'published' | 'archived';
  isFeatured?: boolean;
  examText?: string;
  outcomes?: string[];
  lessons?: AcademyLessonInput[];
}

export interface AcademyCommandResult {
  success: true;
  enrollmentId?: number;
  orderId?: number;
  status?: string;
  message?: string;
}

export interface AcademyCertificate {
  code: string;
  issuedAt: string | null;
  learnerName: string | null;
  pharmacistLicense: string;
  courseTitle: string;
  cpeCredits: string | null;
  conferenceCode: string | null;
}

const id = { type: 'integer', minimum: 1, maximum: 2147483647 } as const;
const text = { type: 'string' } as const;
const nullableText = { anyOf: [text, { type: 'null' }] } as const;
const count = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const object = (properties: Readonly<Record<string, unknown>>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
}) as const;

const courseFields = {
  id, title: text, summary: nullableText, coverUrl: nullableText, durationLabel: nullableText,
  cpeLabel: text, categoryName: nullableText, categoryColor: nullableText,
  instructorName: nullableText, instructorTitle: nullableText,
  studentCount: count, rating: { anyOf: [{ type: 'number' }, { type: 'null' }] }, reviewCount: count,
  outcomes: { type: 'array', items: text }, isFeatured: { type: 'boolean' },
  format: { type: 'string', enum: ['online', 'onsite'] },
  venue: nullableText, trainingStartsAt: nullableText, trainingEndsAt: nullableText,
} as const;

export const AcademyCourseSchema = object(courseFields);
export const AcademyCourseDetailSchema = object({
  ...courseFields,
  cpeCredits: nullableText, conferenceCode: nullableText, price: text, audience: text,
  instructorExpertise: nullableText, instructorImageUrl: nullableText,
  lessons: { type: 'array', items: object({ id, title: text, description: nullableText }) },
});
export const AcademyLearningStateSchema = object({
  enrolled: { type: 'boolean' },
  format: { type: 'string', enum: ['online', 'onsite'] },
  venue: nullableText, trainingStartsAt: nullableText, trainingEndsAt: nullableText,
  orderStatus: nullableText, progressPercent: { type: 'number' }, price: text,
  hasExam: { type: 'boolean' }, examPassed: { type: 'boolean' },
  exam: { type: 'array', items: object({ question: text, options: { type: 'array', items: text } }) },
  lessons: {
    type: 'array',
    items: object({
      id, title: text, description: nullableText, videoUrl: nullableText,
      completed: { type: 'boolean' },
      documents: { type: 'array', items: object({ name: text, fileUrl: text }) },
      quiz: { type: 'array', items: object({ question: text, options: { type: 'array', items: text } }) },
    }),
  },
});
const lessonDocument = {
  type: 'object', additionalProperties: false,
  required: ['name'],
  properties: {
    id, name: text, fileUrl: nullableText, assetId: { type: 'string', minLength: 36, maxLength: 36 },
  },
} as const;
const lessonInput = {
  type: 'object', additionalProperties: false,
  required: ['title'],
  properties: {
    id, title: { type: 'string', minLength: 1, maxLength: 500 }, description: nullableText,
    videoUrl: nullableText, quizText: text,
    documents: { type: 'array', items: lessonDocument, maxItems: 50 },
  },
} as const;
export const AcademyCourseInputSchema = {
  type: 'object', additionalProperties: false,
  required: ['title'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 500 },
    summary: nullableText, categoryId: { anyOf: [id, { type: 'null' }] },
    instructorId: { anyOf: [id, { type: 'null' }] }, coverUrl: nullableText,
    coverAssetId: { type: 'string', minLength: 36, maxLength: 36 },
    durationLabel: nullableText,
    cpeCredits: nullableText, conferenceCode: nullableText, price: { type: 'string', maxLength: 20 },
    audience: { type: 'string', enum: ['all', 'general', 'pharmacist'] },
    format: { type: 'string', enum: ['online', 'onsite'] },
    venue: nullableText, trainingStartsAt: nullableText, trainingEndsAt: nullableText,
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    isFeatured: { type: 'boolean' }, examText: text,
    outcomes: { type: 'array', items: text, maxItems: 50 },
    lessons: { type: 'array', items: lessonInput, maxItems: 100 },
  },
} as const;
export const AcademyCommandResultSchema = {
  type: 'object', additionalProperties: false, required: ['success'],
  properties: {
    success: { type: 'boolean', const: true },
    enrollmentId: id, orderId: id, status: { type: 'string', maxLength: 32 },
    message: { type: 'string', maxLength: 200 },
  },
} as const;
export const AcademyCertificateSchema = object({
  code: text, issuedAt: nullableText, learnerName: nullableText, pharmacistLicense: text,
  courseTitle: text, cpeCredits: nullableText, conferenceCode: nullableText,
});
export const AcademyMemberActorSchema = object({
  kind: { type: 'string', const: 'pharmacy-mock' },
  subject: { type: 'string', minLength: 1, maxLength: 128 },
  pharmacistLicense: { type: 'string', minLength: 1, maxLength: 64 },
  displayName: { type: 'string', minLength: 1, maxLength: 255 },
});
