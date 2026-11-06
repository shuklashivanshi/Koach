import { z } from 'zod';

// Daily loop contracts (Phase 4).

export const PlanTaskView = z.object({
  id: z.string(),
  kind: z.enum(['learn', 'revise', 'practice', 'ca']),
  nodeId: z.string().nullable(),
  title: z.string(),
  minutes: z.number().int(),
  goal: z.string(),
  reason: z.string(),
  source: z.string().nullable(),
  status: z.enum(['todo', 'done', 'moved']),
});
export type PlanTaskView = z.infer<typeof PlanTaskView>;

export const TodayPlan = z.object({
  day: z.string(),
  minutes: z.number().int(),
  daysToPrelims: z.number().int(),
  note: z.string().nullable(),
  tasks: z.array(PlanTaskView),
});
export type TodayPlan = z.infer<typeof TodayPlan>;

export const ReplanRequest = z.object({ minutes: z.number().int().min(10).max(960) });

const Option = z.object({ key: z.string(), text: z.string() });

export const LearnSession = z.object({
  node: z.object({ id: z.string(), title: z.string(), estMinutes: z.number().int() }),
  pyqs: z.array(
    z.object({
      id: z.string(),
      exam: z.string(),
      year: z.number().int(),
      text: z.string(),
      options: z.array(Option).nullable(),
      marks: z.number().int().nullable(),
      directive: z.string().nullable(),
    }),
  ),
  source: z.object({ label: z.string(), chapter: z.string(), reason: z.string() }).nullable(),
  goal: z.string(),
  recall: z.array(z.object({ q: z.string(), a: z.string() })),
});
export type LearnSession = z.infer<typeof LearnSession>;

export const AnswerList = z
  .array(z.object({ pyqId: z.string().max(60), chosen: z.string().max(2).nullable() }))
  .max(50);

export const LearnResult = z.object({
  recall: z
    .array(z.object({ q: z.string().max(400), a: z.string().max(400), got: z.boolean() }))
    .max(10),
  answers: AnswerList,
  taskId: z.string().uuid().optional(),
});
export const LearnOutcome = z.object({
  mastery: z.number(),
  results: z.array(
    z.object({ pyqId: z.string(), correct: z.boolean(), answer: z.string().nullable() }),
  ),
});

export const ReviewCard = z.object({
  id: z.string(),
  nodeId: z.string(),
  kind: z.enum(['node', 'recall', 'mistake']),
  front: z.string(),
  back: z.string(),
});
export const DueCards = z.object({ cards: z.array(ReviewCard) });
export const GradeRequest = z.object({ grade: z.enum(['again', 'hard', 'good', 'easy']) });
export const GradeResponse = z.object({
  due: z.iso.datetime({ offset: true }),
  mastery: z.number(),
});

export const MistakeCauses = ['didnt_know', 'misread', 'eliminated_wrong', 'guessed'] as const;
export const MistakeList = z.object({
  mistakes: z.array(
    z.object({
      id: z.string(),
      pyqId: z.string().nullable(),
      nodeId: z.string().nullable(),
      text: z.string().nullable(),
      chosen: z.string().nullable(),
      correct: z.string().nullable(),
      cause: z.enum(MistakeCauses).nullable(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  /** Monthly "recurring traps": cause → count over the last 30 days. */
  traps: z.record(z.string(), z.number().int()),
});
export const MistakeCause = z.object({ cause: z.enum(MistakeCauses) });

export const Heatmap = z.object({
  sections: z.array(
    z.object({
      sectionId: z.string(),
      title: z.string(),
      studied: z.number().int(),
      total: z.number().int(),
      mastery: z.number(),
    }),
  ),
});

export const PracticeSet = z.object({
  pyqs: z.array(
    z.object({
      id: z.string(),
      year: z.number().int(),
      text: z.string(),
      options: z.array(Option),
    }),
  ),
});
