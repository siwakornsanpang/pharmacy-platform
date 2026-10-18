import { boolean, foreignKey, integer, json, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

export const academyCourseStatusEnum = pgEnum('academy_course_status', ['draft', 'published', 'archived']);
export const academyAudienceEnum = pgEnum('academy_course_audience', ['all', 'general', 'pharmacist']);

export const academyCategories = pgTable('academy_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  color: varchar('color', { length: 20 }).default('#737300'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const academyInstructors = pgTable('academy_instructors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title'),
  expertise: text('expertise'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const academyCourses = pgTable('academy_courses', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id'),
  instructorId: integer('instructor_id'),
  title: text('title').notNull(),
  summary: text('summary'),
  coverUrl: text('cover_url'),
  durationLabel: text('duration_label'),
  cpeCredits: numeric('cpe_credits', { precision: 5, scale: 2 }).default('0'),
  conferenceCode: varchar('conference_code', { length: 255 }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  audience: academyAudienceEnum('audience').notNull().default('all'),
  format: text('format').notNull().default('online'),
  venue: text('venue'),
  trainingStartsAt: timestamp('training_starts_at'),
  trainingEndsAt: timestamp('training_ends_at'),
  status: academyCourseStatusEnum('status').notNull().default('draft'),
  isFeatured: boolean('is_featured').notNull().default(false),
  popularOrder: integer('popular_order').notNull().default(0),
  exam: json('exam'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  categoryIdFk: foreignKey({ name: 'academy_courses_category_id_fkey', columns: [table.categoryId], foreignColumns: [academyCategories.id] }).onDelete('set null'),
  instructorIdFk: foreignKey({ name: 'academy_courses_instructor_id_fkey', columns: [table.instructorId], foreignColumns: [academyInstructors.id] }).onDelete('set null'),
}));

export const academyCourseOutcomes = pgTable('academy_course_outcomes', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  text: text('text').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  courseIdFk: foreignKey({ name: 'academy_course_outcomes_course_id_fkey', columns: [table.courseId], foreignColumns: [academyCourses.id] }).onDelete('cascade'),
}));

export const academyReviews = pgTable('academy_reviews', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  rating: integer('rating').notNull(),
  body: text('body').notNull(),
  reviewerName: text('reviewer_name').notNull(),
  reviewerRole: text('reviewer_role'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  courseIdFk: foreignKey({ name: 'academy_reviews_course_id_fkey', columns: [table.courseId], foreignColumns: [academyCourses.id] }).onDelete('cascade'),
}));

export const academyLessons = pgTable('academy_lessons', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  videoUrl: text('video_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  quiz: json('quiz'),
}, (table) => ({
  courseIdFk: foreignKey({ name: 'academy_lessons_course_id_fkey', columns: [table.courseId], foreignColumns: [academyCourses.id] }).onDelete('cascade'),
}));

export const academyLessonDocuments = pgTable('academy_lesson_documents', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id').notNull(),
  name: text('name').notNull(),
  fileUrl: text('file_url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  lessonIdFk: foreignKey({ name: 'academy_lesson_documents_lesson_id_fkey', columns: [table.lessonId], foreignColumns: [academyLessons.id] }).onDelete('cascade'),
}));

export const academyEnrollments = pgTable('academy_enrollments', {
  id: serial('id').primaryKey(),
  pharmacistLicense: text('pharmacist_license').notNull(),
  displayName: text('display_name'),
  courseId: integer('course_id').notNull(),
  status: text('status').notNull().default('active'),
  progressPercent: numeric('progress_percent', { precision: 5, scale: 2 }).default('0'),
  examPassed: boolean('exam_passed').notNull().default(false),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
}, (table) => ({
  courseIdFk: foreignKey({ name: 'academy_enrollments_course_id_fkey', columns: [table.courseId], foreignColumns: [academyCourses.id] }).onDelete('cascade'),
  licenseCourse: unique('academy_enrollments_license_course').on(table.pharmacistLicense, table.courseId),
}));

export const academyOrders = pgTable('academy_orders', {
  id: serial('id').primaryKey(),
  pharmacistLicense: text('pharmacist_license').notNull(),
  displayName: text('display_name'),
  courseId: integer('course_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('pending'),
  slipUrl: text('slip_url'),
  createdAt: timestamp('created_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
}, (table) => ({
  courseIdFk: foreignKey({ name: 'academy_orders_course_id_fkey', columns: [table.courseId], foreignColumns: [academyCourses.id] }).onDelete('cascade'),
}));

export const academyRefundRequests = pgTable('academy_refund_requests', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orderIdFk: foreignKey({ name: 'academy_refund_requests_order_id_fkey', columns: [table.orderId], foreignColumns: [academyOrders.id] }).onDelete('cascade'),
}));

export const academyCertificates = pgTable('academy_certificates', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().unique('academy_certificates_enrollment_id_key'),
  code: text('code').notNull(),
  issuedAt: timestamp('issued_at').defaultNow(),
}, (table) => ({
  enrollmentIdFk: foreignKey({ name: 'academy_certificates_enrollment_id_fkey', columns: [table.enrollmentId], foreignColumns: [academyEnrollments.id] }).onDelete('cascade'),
}));

export const academyLessonProgress = pgTable('academy_lesson_progress', {
  id: serial('id').primaryKey(),
  pharmacistLicense: text('pharmacist_license').notNull(),
  lessonId: integer('lesson_id').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  lessonIdFk: foreignKey({ name: 'academy_lesson_progress_lesson_id_fkey', columns: [table.lessonId], foreignColumns: [academyLessons.id] }).onDelete('cascade'),
  licenseLesson: unique('academy_lesson_progress_license_lesson').on(table.pharmacistLicense, table.lessonId),
}));

export const academyCommands = pgTable('academy_commands', {
  id: serial('id').primaryKey(),
  actorKind: varchar('actor_kind', { length: 32 }).notNull(),
  actorId: varchar('actor_id', { length: 128 }).notNull(),
  operation: varchar('operation', { length: 64 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  requestHash: varchar('request_hash', { length: 64 }).notNull(),
  result: jsonb('result'),
  status: integer('status'),
  createdAt: timestamp('created_at').defaultNow(),
}, table => ({
  actorOperationKey: unique('academy_commands_actor_operation_key')
    .on(table.actorKind, table.actorId, table.operation, table.idempotencyKey),
}));

export const academyAssetRefs = pgTable('academy_asset_refs', {
  id: serial('id').primaryKey(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  assetId: uuid('asset_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, table => ({
  ownerAsset: unique('academy_asset_refs_owner_asset')
    .on(table.ownerType, table.ownerId, table.ownerSlot, table.assetId),
}));

export const academyMediaIntents = pgTable('academy_media_intents', {
  id: serial('id').primaryKey(),
  operationId: varchar('operation_id', { length: 128 }).notNull().unique(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  attachAssetIds: json('attach_asset_ids').$type<string[]>().notNull(),
  releaseAssetIds: json('release_asset_ids').$type<string[]>().notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
