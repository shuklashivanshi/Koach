import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  uid: text().primaryKey(),
  email: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
