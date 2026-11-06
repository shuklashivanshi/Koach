import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// The learner (Phase 3): profile, per-subject starting levels and Learning Pattern Test results.

export type Level = 'new' | 'some' | 'strong';

export const learnerProfiles = pgTable('learner_profiles', {
  uid: text()
    .primaryKey()
    .references(() => users.uid, { onDelete: 'cascade' }),
  target: text().notNull().default('cse-2027'),
  /** Study minutes per weekday, Monday first (7 entries). */
  weekdayMinutes: jsonb().$type<number[]>().notNull(),
  /** Local "HH:MM-HH:MM" ranges; nudges avoid them. */
  workHours: text(),
  quietHours: text(),
  /** GS section id → self-rated level. */
  selfAssessment: jsonb().$type<Record<string, Level>>().notNull().default({}),
  nudgeTone: text().notNull().default('gentle'),
  timezone: text().notNull().default('Asia/Kolkata'),
  onboardedAt: timestamp({ withTimezone: true }),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const subjectLevels = pgTable(
  'subject_levels',
  {
    uid: text()
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    sectionId: text().notNull(),
    /** 0..1 starting mastery for the section. */
    level: real().notNull(),
    source: text().$type<'self' | 'diagnostic'>().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.uid, t.sectionId] })],
);

export const diagnosticAttempts = pgTable('diagnostic_attempts', {
  id: uuid().primaryKey().defaultRandom(),
  uid: text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  /** [{ pyqId, chosen, correct }] */
  answers: jsonb().$type<{ pyqId: string; chosen: string | null; correct: boolean }[]>().notNull(),
  score: integer().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const lptResults = pgTable('lpt_results', {
  id: uuid().primaryKey().defaultRandom(),
  uid: text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  form: text().$type<'A' | 'B'>().notNull(),
  /** Raw per-game scores (0..1), immediate and delayed. */
  raw: jsonb()
    .$type<{ immediate: Record<string, number>; delayed: Record<string, number> }>()
    .notNull(),
  visual: real().notNull(),
  auditory: real().notNull(),
  readwrite: real().notNull(),
  kinesthetic: real().notNull(),
  lowConfidence: integer().notNull().default(0),
  takenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  /** Bumped by LPT-03 evidence updates. */
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
