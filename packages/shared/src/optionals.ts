import { z } from 'zod';

// Optional Discovery contracts (Phase 7).

const Success = z.object({
  appeared: z.number().int(),
  recommended: z.number().int(),
  rate: z.number().nullable(),
  low: z.number().nullable(),
  high: z.number().nullable(),
  years: z.number().int(),
  smallSample: z.boolean(),
});

export const OptionalList = z.object({
  optionals: z.array(
    z.object({ slug: z.string(), name: z.string(), summary: z.string(), success: Success }),
  ),
});

export const OptionalExplorer = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  hours: z.number().int(),
  topics: z.array(z.string()),
  gsOverlap: z.number(),
  overlapsWith: z.array(z.string()),
  books: z.array(z.string()),
  materials: z.number(),
  answerStyle: z.object({
    analytical: z.number(),
    factual: z.number(),
    diagrams: z.number(),
    numericals: z.number(),
  }),
  success: Success,
  years: z.array(
    z.object({
      examYear: z.number().int(),
      appeared: z.number().int(),
      recommended: z.number().int(),
    }),
  ),
  sources: z.array(z.string()),
});
export type OptionalExplorer = z.infer<typeof OptionalExplorer>;
export const OptionalCompare = z.object({ optionals: z.array(OptionalExplorer) });

export const FitQuiz = z.object({
  background: z.enum([
    'engineering',
    'science',
    'medicine',
    'commerce',
    'economics',
    'humanities',
    'law',
    'literature',
    'agriculture',
    'management',
    'any',
  ]),
  interests: z.array(z.string()).max(6),
  reading: z.array(z.enum(['theory', 'data', 'narratives', 'debates'])).max(4),
  answerStyle: z.array(z.enum(['analytical', 'factual', 'diagrams', 'numericals'])).max(4),
  hours: z.number().int().min(50).max(2000),
  languages: z.array(z.string().max(20)).max(5),
  risk: z.number().min(0).max(1),
});
export type FitQuiz = z.infer<typeof FitQuiz>;

const Fit = z.object({
  slug: z.string(),
  name: z.string(),
  score: z.number(),
  components: z.record(z.string(), z.number()),
  reason: z.string(),
  surprising: z.boolean(),
});
export const FitRanking = z.object({
  top: z.array(Fit),
  surprising: z.array(Fit),
  /** Shown behind Why? */
  weights: z.record(z.string(), z.number()),
});
export type FitRanking = z.infer<typeof FitRanking>;

export const DecisionStatus = z.object({
  deadline: z.string(),
  daysLeft: z.number().int(),
  chosen: z.string().nullable(),
  reasons: z.string().nullable(),
  quizTaken: z.boolean(),
});
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const CoachQuestion = z.object({
  question: z.string().min(3).max(500),
  slugs: z.array(z.string()).max(3),
});
export const CoachReply = z.object({ answer: z.string(), stressTest: z.string().nullable() });
export const OptionalChoice = z.object({ slug: z.string(), reasons: z.string().min(3).max(1000) });
export type OptionalList = z.infer<typeof OptionalList>;
export type OptionalCompare = z.infer<typeof OptionalCompare>;
