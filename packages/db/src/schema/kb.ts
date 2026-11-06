import {
  boolean,
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

// UPSC knowledge base (Phase 2). Seed rows come from packages/kb; review status lets a human
// approve or correct AI suggestions, and the loader never overwrites reviewed rows.

/** suggested = AI output, approved = reviewer agreed, corrected = reviewer changed it. */
export type ReviewStatus = 'suggested' | 'approved' | 'corrected';

export const syllabusNodes = pgTable(
  'syllabus_nodes',
  {
    id: text().primaryKey(),
    /** prelims_gs1 | csat | gs1 | gs2 | gs3 | gs4 | essay | optional:<slug> */
    paper: text().notNull(),
    parentId: text(),
    title: text().notNull(),
    /** paper | section | topic | node (node = one study session) */
    kind: text().$type<'paper' | 'section' | 'topic' | 'node'>().notNull(),
    estMinutes: integer(),
    prelims: boolean().notNull().default(false),
    mains: boolean().notNull().default(false),
    ord: integer().notNull().default(0),
  },
  (t) => [index().on(t.paper), index().on(t.parentId)],
);

export const nodePrereqs = pgTable(
  'node_prereqs',
  {
    nodeId: text()
      .notNull()
      .references(() => syllabusNodes.id, { onDelete: 'cascade' }),
    prereqId: text()
      .notNull()
      .references(() => syllabusNodes.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.prereqId] })],
);

export interface PyqOption {
  key: string;
  text: string;
}

export const pyqs = pgTable(
  'pyqs',
  {
    /** e.g. pre-2023-gs1-q017, mains-2019-gs2-q04 */
    id: text().primaryKey(),
    exam: text().$type<'prelims' | 'mains'>().notNull(),
    paper: text().notNull(), // gs1..gs4 (prelims GS-I is gs1)
    year: integer().notNull(),
    number: integer().notNull(),
    text: text().notNull(),
    options: jsonb().$type<PyqOption[]>(),
    answer: text(),
    /** official = UPSC answer key; model = two independent AI solves agreed. */
    answerSource: text().$type<'official' | 'model'>(),
    marks: integer(),
    wordLimit: integer(),
    /** statement | how_many | match | assertion_reason | direct | descriptive */
    questionType: text(),
    /** static | partial | current_affairs */
    sourceType: text(),
    /** Mains directive word: discuss, examine, critically analyse, ... */
    directive: text(),
    tagStatus: text().$type<ReviewStatus>().notNull().default('suggested'),
  },
  (t) => [index().on(t.exam, t.year)],
);

export const pyqTags = pgTable(
  'pyq_tags',
  {
    pyqId: text()
      .notNull()
      .references(() => pyqs.id, { onDelete: 'cascade' }),
    nodeId: text()
      .notNull()
      .references(() => syllabusNodes.id, { onDelete: 'cascade' }),
    primary: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.pyqId, t.nodeId] }), index().on(t.nodeId)],
);

export const sources = pgTable('sources', {
  id: text().primaryKey(),
  kind: text().notNull(), // ncert | book | official
  title: text().notNull(),
  author: text(),
  /** Shown instead of title/author when the book is named after an institute or platform. */
  neutralLabel: text(),
});

export const nodeSources = pgTable('node_sources', {
  nodeId: text()
    .primaryKey()
    .references(() => syllabusNodes.id, { onDelete: 'cascade' }),
  sourceId: text()
    .notNull()
    .references(() => sources.id),
  chapter: text().notNull(),
  reason: text().notNull(),
  status: text().$type<ReviewStatus>().notNull().default('suggested'),
});

export const strategyClaims = pgTable(
  'strategy_claims',
  {
    id: text().primaryKey(),
    topic: text().notNull(),
    claim: text().notNull(),
    kind: text().notNull(), // topper | official
    /** Name of the official source (UPSC, PIB, ...) when kind = official; never a person or site. */
    officialSource: text(),
    sourceUrl: text().notNull(),
    sourceDate: date(),
  },
  (t) => [index().on(t.topic)],
);

export const kbReviews = pgTable('kb_reviews', {
  id: uuid().primaryKey().defaultRandom(),
  targetType: text().notNull(), // pyq | node_source
  targetId: text().notNull(),
  action: text().notNull(), // approve | correct
  before: jsonb(),
  after: jsonb(),
  reviewer: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** The user's own class notes, kept for refining playbooks (KB-06). */
export const userNotes = pgTable('user_notes', {
  id: uuid().primaryKey().defaultRandom(),
  uid: text()
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text().notNull(),
  body: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
