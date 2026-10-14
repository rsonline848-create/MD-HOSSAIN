import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const shops = pgTable('shops', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
