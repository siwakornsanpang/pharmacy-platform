import { bigint, pgTable, serial, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey(),
  ownerDomain: varchar('owner_domain', { length: 32 }).notNull(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  kind: varchar('kind', { length: 32 }).notNull(),
  visibility: varchar('visibility', { length: 16 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mime: varchar('mime', { length: 127 }).notNull(),
  byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
  objectKey: varchar('object_key', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaAssetPins = pgTable('media_asset_pins', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id').notNull().references(() => mediaAssets.id),
  ownerDomain: varchar('owner_domain', { length: 32 }).notNull(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  state: varchar('state', { length: 16 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaAssetReferences = pgTable('media_asset_references', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id').notNull().references(() => mediaAssets.id),
  ownerDomain: varchar('owner_domain', { length: 32 }).notNull(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaCleanupJobs = pgTable('media_cleanup_jobs', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id').notNull(),
  reason: varchar('reason', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaUploadIntents = pgTable('media_upload_intents', {
  id: uuid('id').primaryKey(),
  ticketHash: varchar('ticket_hash', { length: 64 }).notNull().unique(),
  ownerDomain: varchar('owner_domain', { length: 32 }).notNull(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  kind: varchar('kind', { length: 32 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mime: varchar('mime', { length: 127 }).notNull(),
  byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
  actorKind: varchar('actor_kind', { length: 32 }).notNull(),
  actorKey: varchar('actor_key', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 32 }),
  sessionId: varchar('session_id', { length: 64 }),
  requiredCapability: varchar('required_capability', { length: 64 }),
  pharmacistLicense: varchar('pharmacist_license', { length: 64 }),
  displayName: varchar('display_name', { length: 255 }),
  subject: varchar('subject', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at').defaultNow(),
});
