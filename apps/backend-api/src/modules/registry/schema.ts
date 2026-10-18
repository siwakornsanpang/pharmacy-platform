import { pgTable, serial, text, unique } from 'drizzle-orm/pg-core';

/** Registry owns preservation of the complete roster row; HTTP projections stay explicit. */
export const pharmacists = pgTable('pharmacists', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  registrationId: text('registration_id').notNull(),
  province: text('province'),
  status: text('status').default('ใช้งาน'),
  address: text('address'),
  expiryDate: text('expiry_date'),
  imageUrl: text('image_url'),
  prefix: text('prefix'),
  citizenId: text('citizen_id'),
}, table => ({
  registrationIdUnq: unique().on(table.registrationId),
}));
