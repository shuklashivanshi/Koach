import {
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

// The daily loop (Phase 4): plan tasks, FSRS cards, node mastery, mistakes and reminders.

const owner = () =>
  text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' });

export const nodeMastery = pgTable(
  'node_mastery',
  {
    uid: owner(),
    nodeId: text().notNull(),
    mastery: real().notNull(),
    studiedAt: timestamp({ withTimezone: true }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.uid, t.nodeId] })],
);

export const srsCards = pgTable(
  'srs_cards',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    nodeId: text().notNull(),
    /** node = revision unit for a studied node; recall = retrieval-check item; mistake = wrong MCQ */
    kind: text().$type<'node' | 'recall' | 'mistake'>().notNull(),
    front: text().notNull(),
    back: text().notNull(),
    /** ts-fsrs card state (JSON). */
    state: jsonb().$type<Record<string, unknown>>().notNull(),
    due: timestamp({ withTimezone: true }).notNull(),
    reps: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.uid, t.due)],
);

export const planTasks = pgTable(
  'plan_tasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    day: date().notNull(),
    position: integer().notNull(),
    kind: text().$type<'learn' | 'revise' | 'practice' | 'ca'>().notNull(),
    nodeId: text(),
    title: text().notNull(),
    minutes: integer().notNull(),
    goal: text().notNull(),
    reason: text().notNull(),
    source: text(),
    priority: real().notNull(),
    status: text().$type<'todo' | 'done' | 'moved'>().notNull().default('todo'),
    doneAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.uid, t.day)],
);

/** "What moved and why" note per day (SCHED-04). */
export const planNotes = pgTable(
  'plan_notes',
  { uid: owner(), day: date().notNull(), note: text().notNull() },
  (t) => [primaryKey({ columns: [t.uid, t.day] })],
);

export const mistakes = pgTable(
  'mistakes',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    pyqId: text(),
    nodeId: text(),
    subject: text(),
    /** didnt_know | misread | eliminated_wrong | guessed; null until the learner taps one. */
    cause: text(),
    chosen: text(),
    correct: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.uid, t.createdAt)],
);

/** Retrieval-check items per node, shared across learners (generated once, verified). */
export const recallItems = pgTable('recall_items', {
  nodeId: text().primaryKey(),
  items: jsonb().$type<{ q: string; a: string }[]>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const notificationPrefs = pgTable('notification_prefs', {
  uid: text()
    .primaryKey()
    .references(() => users.uid, { onDelete: 'cascade' }),
  /** type → { on, time "HH:MM" } */
  prefs: jsonb().$type<Record<string, { on: boolean; time: string }>>().notNull(),
  tone: text().$type<'calm' | 'firm' | 'cheerful'>().notNull().default('calm'),
});

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    endpoint: text().notNull(),
    keys: jsonb().$type<{ p256dh: string; auth: string }>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.endpoint)],
);

export const notificationLog = pgTable(
  'notification_log',
  {
    id: uuid().primaryKey().defaultRandom(),
    uid: owner(),
    type: text().notNull(),
    day: date().notNull(),
    sentAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.uid, t.type, t.day)],
);
