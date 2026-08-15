import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const templates = sqliteTable('template', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  htmlContent: text('html_content').notNull(),
  designJson: text('design_json'),
  placeholders: text('placeholders').notNull(), // JSON string array
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

export const assets = sqliteTable('asset', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  urlPath: text('url_path').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

export const deliveryQueue = sqliteTable('delivery_queue', {
  id: text('id').primaryKey(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'processing' | 'sent' | 'failed'
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  lastError: text('last_error'),
  runAt: text('run_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('delivery_queue_status_run_at_idx').on(table.status, table.runAt),
]);

export const deliveryLogs = sqliteTable('delivery_log', {
  id: text('id').primaryKey(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  templateId: text('template_id'),
  status: text('status').notNull(), // 'success' | 'failed' | 'skipped'
  errorMessage: text('error_message'),
  sentAt: text('sent_at').default(sql`(CURRENT_TIMESTAMP)`),
});

export const settings = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const apiKeys = sqliteTable('api_key', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hashedKey: text('hashed_key').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  scope: text('scope').default('admin').notNull(), // 'admin' | 'send_only'
  allowedOrigins: text('allowed_origins'), // JSON string array, null = open
  allowedIps: text('allowed_ips'), // JSON string array, null = open
  lastUsedAt: text('last_used_at'),
  revoked: integer('revoked', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  uniqueIndex('api_key_hashed_key_idx').on(table.hashedKey),
]);

export const suppressions = sqliteTable('suppression', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  templateId: text('template_id'), // null = global suppression
  reason: text('reason'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  uniqueIndex('suppression_email_template_id_idx').on(table.email, table.templateId),
]);

export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('admin').notNull(), // 'admin' | 'member'
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  uniqueIndex('user_email_idx').on(table.email),
]);

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  index('session_user_id_idx').on(table.userId),
]);
