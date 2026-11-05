import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Codes are keyed by email (the user may not exist yet) and deleted explicitly on account deletion.
// Only a salted SHA-256 hash of the code is stored.
export const emailCodes = pgTable(
  'email_codes',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    codeHash: text().notNull(),
    salt: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    attempts: integer().notNull().default(0),
    ip: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.email, t.createdAt), index().on(t.ip, t.createdAt)],
);
