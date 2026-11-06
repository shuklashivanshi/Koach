import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// Memory cues and coaching (Phase 6).

const owner = () =>
  text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' });

/** 5–8 verified key facts per node; every cue is built from these (shared, no PII). */
export const nodeFacts = pgTable('node_facts', {
  nodeId: text().primaryKey(),
  facts: jsonb().$type<string[]>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const cues = pgTable(
  'cues',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    nodeId: text().notNull(),
    format: text().notNull(),
    content: jsonb().$type<Record<string, unknown>>().notNull(),
    rating: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.uid, t.nodeId, t.format)],
);

/** A learner's own memory palace: rooms with ordered spots (loci). */
export const memoryPalaces = pgTable('memory_palaces', {
  uid: text()
    .primaryKey()
    .references(() => users.uid, { onDelete: 'cascade' }),
  rooms: jsonb().$type<{ name: string; loci: string[] }[]>().notNull(),
});

export const nudgeLog = pgTable(
  'nudge_log',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    day: date().notNull(),
    kind: text().notNull(),
    text: text().notNull(),
    sentAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.uid, t.day)],
);

export const coachNotes = pgTable(
  'coach_notes',
  {
    uid: owner(),
    /** Monday of the week the note covers. */
    week: date().notNull(),
    lines: jsonb().$type<string[]>().notNull(),
    readAt: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.uid, t.week] })],
);

export const wellbeing = pgTable(
  'wellbeing',
  {
    uid: owner(),
    week: date().notNull(),
    level: text().$type<'light' | 'fine' | 'heavy'>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.uid, t.week] })],
);
