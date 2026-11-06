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
