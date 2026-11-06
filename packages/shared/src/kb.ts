import { z } from 'zod';

// Knowledge-base read API (Phase 2). Client-facing: every string here passes the naming guard.

export const KbNode = z.object({
  id: z.string(),
  paper: z.string(),
  parentId: z.string().nullable(),
  title: z.string(),
  kind: z.enum(['paper', 'section', 'topic', 'node']),
  estMinutes: z.number().int().nullable(),
  prelims: z.boolean(),
  mains: z.boolean(),
});
export type KbNode = z.infer<typeof KbNode>;

export const KbNodeList = z.object({ nodes: z.array(KbNode) });

export const KbFrequency = z.object({
  prelims: z.number().int(),
  mains: z.number().int(),
  years: z.array(z.number().int()),
});

export const KbSource = z.object({
  /** "Title · Author", or a neutral label for books named after an institute or platform. */
  label: z.string(),
  kind: z.string(),
  chapter: z.string(),
  reason: z.string(),
});

export const KbNodeDetail = z.object({
  node: KbNode,
  prereqs: z.array(z.string()),
  children: z.array(z.object({ id: z.string(), title: z.string() })),
  source: KbSource.nullable(),
  frequency: KbFrequency,
});
export type KbNodeDetail = z.infer<typeof KbNodeDetail>;

export const KbSubjectWeight = z.object({
  paper: z.string(),
  sectionId: z.string(),
  title: z.string(),
  prelims: z.number().int(),
  mains: z.number().int(),
  prelimsShare: z.number(),
  mainsShare: z.number(),
});
export const KbStats = z.object({ subjects: z.array(KbSubjectWeight) });

export const KbPyq = z.object({
  id: z.string(),
  exam: z.enum(['prelims', 'mains']),
  paper: z.string(),
  year: z.number().int(),
  number: z.number().int(),
  text: z.string(),
  options: z.array(z.object({ key: z.string(), text: z.string() })).nullable(),
  answer: z.string().nullable(),
  marks: z.number().int().nullable(),
  wordLimit: z.number().int().nullable(),
  questionType: z.string().nullable(),
  sourceType: z.string().nullable(),
  directive: z.string().nullable(),
});
export type KbPyq = z.infer<typeof KbPyq>;
export const KbPyqList = z.object({ pyqs: z.array(KbPyq) });

export const KbStrategyAnswer = z.object({
  answered: z.boolean(),
  answer: z.string().nullable(),
  /** Shown as "Based on N topper accounts" and/or official source names; never people or sites. */
  basis: z.object({ topperAccounts: z.number().int(), officialSources: z.array(z.string()) }),
});
export type KbStrategyAnswer = z.infer<typeof KbStrategyAnswer>;

// --- Admin review (KB-07) -----------------------------------------------------------------

export const ReviewPyqItem = z.object({
  type: z.literal('pyq'),
  id: z.string(),
  exam: z.string(),
  year: z.number().int(),
  text: z.string(),
  options: z.array(z.object({ key: z.string(), text: z.string() })).nullable(),
  answer: z.string().nullable(),
  questionType: z.string().nullable(),
  sourceType: z.string().nullable(),
  directive: z.string().nullable(),
  nodes: z.array(z.object({ id: z.string(), title: z.string(), primary: z.boolean() })),
});
export const ReviewSourceItem = z.object({
  type: z.literal('source'),
  id: z.string(),
  nodeTitle: z.string(),
  sourceId: z.string(),
  sourceLabel: z.string(),
  chapter: z.string(),
  reason: z.string(),
});
export const ReviewSample = z.object({
  items: z.array(z.discriminatedUnion('type', [ReviewPyqItem, ReviewSourceItem])),
});
export type ReviewSample = z.infer<typeof ReviewSample>;

export const ReviewPyqDecision = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('correct'),
    nodes: z
      .array(z.object({ id: z.string(), primary: z.boolean() }))
      .min(1)
      .max(5),
    questionType: z.enum([
      'statement',
      'how_many',
      'match',
      'assertion_reason',
      'direct',
      'descriptive',
    ]),
    sourceType: z.enum(['static', 'partial', 'current_affairs']),
    directive: z.string().max(40).nullable().optional(),
  }),
]);
export type ReviewPyqDecision = z.infer<typeof ReviewPyqDecision>;

export const ReviewSourceDecision = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('correct'),
    sourceId: z.string(),
    chapter: z.string().min(1).max(120),
    reason: z.string().min(5).max(200),
  }),
]);
export type ReviewSourceDecision = z.infer<typeof ReviewSourceDecision>;

const Tally = z.object({
  suggested: z.number().int(),
  approved: z.number().int(),
  corrected: z.number().int(),
  accuracy: z.number().nullable(),
});
export const ReviewSummary = z.object({ pyq: Tally, source: Tally });
export type ReviewSummary = z.infer<typeof ReviewSummary>;

export const SourceCatalogue = z.object({
  sources: z.array(z.object({ id: z.string(), kind: z.string(), label: z.string() })),
});
