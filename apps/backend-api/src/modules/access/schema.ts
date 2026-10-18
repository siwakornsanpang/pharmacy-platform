import { pgTable, serial, text, varchar, timestamp, integer, boolean, foreignKey, jsonb } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', { name: text('name').primaryKey() });
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow(),
  active: boolean('active').notNull().default(true),
});
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  label: text('label').notNull(),
  group: text('group'),
  order: integer('order').notNull().default(0),
});
// Legacy duplicate/unknown mappings are preserved; only catalog keys authorize.
export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(), role: text('role').notNull(), permissionKey: text('permission_key').notNull(),
  isActive: boolean('is_active').notNull().default(false),
});
export const staffSessions = pgTable('staff_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, table => [foreignKey({ name: 'staff_sessions_user_id_users_id_fk', columns: [table.userId], foreignColumns: [users.id] }).onDelete('cascade')]);
export const accessAudit = pgTable('access_audit', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id'),
  actorUsername: text('actor_username').notNull(),
  actorRole: text('actor_role').notNull(),
  sessionId: text('session_id').notNull(),
  action: text('action').notNull(),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, table => [foreignKey({ name: 'access_audit_actor_user_id_users_id_fk', columns: [table.actorUserId], foreignColumns: [users.id] }).onDelete('set null')]);
