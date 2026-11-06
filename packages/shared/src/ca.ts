import { z } from 'zod';

// Current affairs contracts (Phase 5).

export const CaItem = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  url: z.string(),
  source: z.string(),
  nodes: z.array(z.object({ id: z.string(), title: z.string() })),
  createdAt: z.iso.datetime({ offset: true }),
});
export type CaItem = z.infer<typeof CaItem>;

export const CaToday = z.object({
  items: z.array(CaItem),
  questions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['statement', 'how_many', 'match']),
      stem: z.string(),
      options: z.array(z.object({ key: z.string(), text: z.string() })),
      source: z.object({ title: z.string(), url: z.string(), name: z.string() }),
      /** Present once the learner has answered (answers are never sent before). */
      result: z.object({ chosen: z.string().nullable(), correct: z.boolean() }).nullable(),
    }),
  ),
});
export type CaToday = z.infer<typeof CaToday>;

export const CaAnswers = z.object({
  answers: z
    .array(z.object({ questionId: z.string().uuid(), chosen: z.string().max(2).nullable() }))
    .max(20),
  taskId: z.string().uuid().optional(),
});
export const CaResults = z.object({
  results: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
});
export type CaResults = z.infer<typeof CaResults>;

export const CaReport = z.object({ reason: z.string().max(300).optional() });
export const CaShare = z.object({ url: z.url().max(1000) });
export const CaNodeItems = z.object({ items: z.array(CaItem.omit({ nodes: true })) });
export type CaNodeItems = z.infer<typeof CaNodeItems>;
