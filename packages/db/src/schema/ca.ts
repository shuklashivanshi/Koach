import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// Current affairs (Phase 5): official items linked to the syllabus, and the verified daily quiz.

export const caItems = pgTable(
  'ca_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    url: text().notNull(),
    /** Normalised title, used to drop near-duplicate releases. */
    titleKey: text().notNull(),
    source: text().notNull(), // PIB | RBI | SEBI | shared
    title: text().notNull(),
    publishedAt: timestamp({ withTimezone: true }),
    summary: text(),
    relevance: real(),
    nodes: jsonb().$type<string[]>().notNull().default([]),
    visible: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.url), uniqueIndex().on(t.titleKey), index().on(t.createdAt)],
);

export const caQuestions = pgTable(
  'ca_questions',
  {
    id: uuid().primaryKey().defaultRandom(),
    day: date().notNull(),
    itemId: uuid()
      .notNull()
      .references(() => caItems.id, { onDelete: 'cascade' }),
    kind: text().$type<'statement' | 'how_many' | 'match'>().notNull(),
    stem: text().notNull(),
    options: jsonb().$type<{ key: string; text: string }[]>().notNull(),
    answer: text().notNull(),
    explanation: text().notNull(),
    status: text().$type<'live' | 'pulled'>().notNull().default('live'),
    reports: integer().notNull().default(0),
  },
  (t) => [index().on(t.day)],
);

export const caAttempts = pgTable(
  'ca_attempts',
  {
    uid: text()
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    questionId: uuid()
      .notNull()
      .references(() => caQuestions.id, { onDelete: 'cascade' }),
    chosen: text(),
    correct: boolean().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.uid, t.questionId] })],
);

export const caReports = pgTable('ca_reports', {
  id: uuid().primaryKey().defaultRandom(),
  uid: text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  questionId: uuid()
    .notNull()
    .references(() => caQuestions.id, { onDelete: 'cascade' }),
  reason: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Links a learner shares for the next ingest (CA-01). */
export const caShared = pgTable('ca_shared', {
  id: uuid().primaryKey().defaultRandom(),
  uid: text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  url: text().notNull(),
  status: text().$type<'queued' | 'done' | 'rejected'>().notNull().default('queued'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
