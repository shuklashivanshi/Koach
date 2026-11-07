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

/** The learner's own fit for one optional (D-03), from their stored quiz answers. */
export const OptionalFit = z.object({
  score: z.number(),
  components: z.record(z.string(), z.number()),
  reason: z.string(),
  surprising: z.boolean(),
});
export type OptionalFit = z.infer<typeof OptionalFit>;

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
  /** Null until the learner takes the quiz (and for literature optionals without the language). */
  fit: OptionalFit.nullable(),
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

/** The choice response: when the optional joins the plan (D-05). */
export const OptionalChoiceResult = DecisionStatus.extend({
  /** First plan day that includes the optional (IST, YYYY-MM-DD). */
  startsOn: z.string(),
  /** True when that day is in the Prelims-intensive phase, so units wait until after Prelims. */
  pausedForPrelims: z.boolean(),
});
export type OptionalChoiceResult = z.infer<typeof OptionalChoiceResult>;

export const OptionalOutlineUnit = z.object({
  nodeId: z.string(),
  title: z.string(),
  paper: z.enum(['I', 'II']).nullable(),
  minutes: z.number().int(),
  status: z.enum(['todo', 'studied']),
  /** The plan day this unit is already scheduled for, if any. */
  scheduledOn: z.string().nullable(),
});
export type OptionalOutlineUnit = z.infer<typeof OptionalOutlineUnit>;

/** Coverage outline of the chosen optional (OPT-04). */
export const OptionalOutline = z.object({
  slug: z.string(),
  name: z.string(),
  /** The profile's estimated first-pass hours; shown beside plannedHours, never conflated. */
  firstPassHours: z.number().int(),
  /** Hours the plan gives these units (units x minutes / 60). */
  plannedHours: z.number(),
  studied: z.number().int(),
  /** True while the Prelims-intensive phase has paused optional units. */
  paused: z.boolean(),
  units: z.array(OptionalOutlineUnit),
});
export type OptionalOutline = z.infer<typeof OptionalOutline>;

export const CoachQuestion = z.object({
  question: z.string().min(3).max(500),
  slugs: z.array(z.string()).max(3),
});
export const CoachReply = z.object({ answer: z.string(), stressTest: z.string().nullable() });
export const OptionalChoice = z.object({ slug: z.string(), reasons: z.string().min(3).max(1000) });
export type OptionalList = z.infer<typeof OptionalList>;
export type OptionalCompare = z.infer<typeof OptionalCompare>;
