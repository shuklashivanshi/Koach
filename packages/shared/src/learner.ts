import { z } from 'zod';

// Learner profile, diagnostic and Learning Pattern Test contracts (Phase 3).

export const LevelChoice = z.enum(['new', 'some', 'strong']);
const HourRange = z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/);

export const ProfileInput = z.object({
  target: z.string().max(40).default('cse-2027'),
  weekdayMinutes: z.array(z.number().int().min(0).max(960)).length(7),
  workHours: HourRange.nullable(),
  quietHours: HourRange.nullable(),
  /** subject id → self-rating */
  selfAssessment: z.record(z.string(), LevelChoice),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

export const Profile = ProfileInput.extend({
  nudgeTone: z.string(),
  timezone: z.string(),
  onboardedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type Profile = z.infer<typeof Profile>;
export const ProfileResponse = z.object({ profile: Profile.nullable() });

export const SubjectList = z.object({
  subjects: z.array(z.object({ id: z.string(), title: z.string() })),
});

export const DiagnosticQuestions = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      year: z.number().int(),
      text: z.string(),
      options: z.array(z.object({ key: z.string(), text: z.string() })),
      subject: z.string(),
    }),
  ),
});
export type DiagnosticQuestions = z.infer<typeof DiagnosticQuestions>;

export const DiagnosticSubmit = z.object({
  /** Empty when the learner skipped the check. */
  answers: z
    .array(z.object({ pyqId: z.string().max(60), chosen: z.string().max(2).nullable() }))
    .max(40),
});
export type DiagnosticSubmit = z.infer<typeof DiagnosticSubmit>;

export const DiagnosticOutcome = z.object({
  score: z.number().int(),
  total: z.number().int(),
  /** subject id → 0..1 starting level */
  levels: z.record(z.string(), z.number()),
  /** Answer key for review after submitting. */
  review: z.array(
    z.object({ pyqId: z.string(), chosen: z.string().nullable(), correct: z.boolean() }),
  ),
});
export type DiagnosticOutcome = z.infer<typeof DiagnosticOutcome>;
