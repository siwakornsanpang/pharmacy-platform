import {
  integer, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, unique, varchar,
} from 'drizzle-orm/pg-core';

export const requestStatusEnum = pgEnum('request_status', [
  'draft',
  'pending',
  'processing',
  'incomplete',
  'ready_to_ship',
  'shipping',
  'success',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'qr_payment',
  'credit_card',
  'bank_transfer',
]);

export const taxpayerTypeEnum = pgEnum('taxpayer_type', [
  'individual',
  'corporate',
]);

export const requests = pgTable('requests', {
  id: varchar('id', { length: 50 }).primaryKey(),
  pharmacistLicenseId: text('pharmacist_license_id').notNull(),
  requestDate: timestamp('request_date').defaultNow(),
  requestStatus: requestStatusEnum('request_status').default('draft'),
  licenseType: varchar('license_type', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const requestShippingDetails = pgTable('request_shipping_details', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 50 }).references(() => requests.id, { onDelete: 'cascade' }).notNull(),
  shippingAddress: text('shipping_address'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const requestPaymentLogs = pgTable('request_payment_logs', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 50 }).references(() => requests.id, { onDelete: 'cascade' }).notNull(),
  paymentDate: timestamp('payment_date'),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentReferenceId: varchar('payment_reference_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const requestTaxInvoices = pgTable('request_tax_invoices', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 50 }).references(() => requests.id, { onDelete: 'cascade' }).notNull(),
  taxpayerType: taxpayerTypeEnum('taxpayer_type'),
  taxInvoiceName: varchar('tax_invoice_name', { length: 255 }),
  taxIdNumber: varchar('tax_id_number', { length: 13 }),
  branchCode: varchar('branch_code', { length: 50 }),
  registeredTaxAddress: text('registered_tax_address'),
  taxInvoiceNumber: varchar('tax_invoice_number', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Owned by the coordinated 0009 media/content-intent migration.
export const requestOperationKeys = pgTable('request_operation_keys', {
  id: serial('id').primaryKey(),
  actorKey: varchar('actor_key', { length: 100 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  route: varchar('route', { length: 255 }).notNull(),
  key: varchar('key', { length: 128 }).notNull(),
  requestHash: varchar('request_hash', { length: 64 }).notNull(),
  result: jsonb('result'),
  status: integer('status'),
  createdAt: timestamp('created_at').defaultNow(),
}, table => ({
  authorityKey: unique('request_operation_keys_authority_key')
    .on(table.actorKey, table.method, table.route, table.key),
}));

// Owned by the coordinated 0009 media/content-intent migration.
export const requestAssetRefs = pgTable('request_asset_refs', {
  id: serial('id').primaryKey(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  assetId: varchar('asset_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, table => ({
  ownerAsset: unique('request_asset_refs_owner_asset')
    .on(table.ownerType, table.ownerId, table.ownerSlot, table.assetId),
}));

export const requestMediaIntents = pgTable('request_media_intents', {
  id: serial('id').primaryKey(),
  operationId: varchar('operation_id', { length: 128 }).notNull().unique(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  attachAssetIds: jsonb('attach_asset_ids').$type<string[]>().notNull(),
  releaseAssetIds: jsonb('release_asset_ids').$type<string[]>().notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
