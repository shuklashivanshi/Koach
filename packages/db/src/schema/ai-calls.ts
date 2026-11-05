import { index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const aiCalls = pgTable(
  'ai_calls',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: text().references(() => users.uid, { onDelete: 'cascade' }),
    feature: text().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    chars: integer().notNull().default(0),
    estCostUsd: numeric({ precision: 10, scale: 6, mode: 'number' }).notNull().default(0),
    latencyMs: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.uid, t.createdAt)],
);
