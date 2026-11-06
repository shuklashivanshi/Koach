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

// --- Learning Pattern Test (LPT-01..03) ---------------------------------------------------

const LatLon = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });

/** What the client needs to run the games. Recall lists come as audio only (see /v1/lpt/audio). */
export const LptForm = z.object({
  form: z.enum(['A', 'B']),
  places: z.array(z.object({ name: z.string(), lat: z.number(), lon: z.number() })),
  grid: z.array(z.array(z.number().int())),
  listLengths: z.array(z.number().int()),
  passage: z.string(),
  /** Event labels, shuffled. */
  events: z.array(z.string()),
  /** The delayed round re-asks these. */
  delayed: z.object({ places: z.array(z.string()), list: z.number().int() }),
});
export type LptForm = z.infer<typeof LptForm>;

export const LptAudio = z.object({ audioBase64: z.string() });

export const LptSubmit = z.object({
  form: z.enum(['A', 'B']),
  immediate: z.object({
    mapPins: z.record(z.string(), LatLon),
    grid: z.array(z.array(z.number().int().min(0).max(24)).max(12)).max(10),
    listen: z.array(z.string().max(500)).max(5),
    readWrite: z.string().max(2000),
    arrange: z.array(z.string().max(100)).max(12),
  }),
  delayed: z.object({
    mapPins: z.record(z.string(), LatLon),
    listen: z.string().max(500),
    readWrite: z.string().max(2000),
    arrange: z.array(z.string().max(100)).max(12),
  }),
  /** Time the page was hidden, and games skipped: either flags the result as low confidence. */
  hiddenMs: z.number().int().min(0),
  skipped: z.array(z.string()).max(5),
});
export type LptSubmit = z.infer<typeof LptSubmit>;

export const LptProfile = z.object({
  scores: z.object({
    visual: z.number(),
    auditory: z.number(),
    readwrite: z.number(),
    kinesthetic: z.number(),
  }),
  line: z.string(),
  lowConfidence: z.boolean(),
  takenAt: z.iso.datetime({ offset: true }),
  retestDue: z.iso.datetime({ offset: true }),
});
export type LptProfile = z.infer<typeof LptProfile>;
export const LptProfileResponse = z.object({ profile: LptProfile.nullable() });

export const LptEvidence = z.object({
  pattern: z.enum(['visual', 'auditory', 'readwrite', 'kinesthetic']),
  success: z.number().min(0).max(1),
});

export const TranscribeRequest = z.object({
  audioBase64: z.string().max(4_000_000),
  seconds: z.number().min(0.5).max(60),
});
export const TranscribeResponse = z.object({ text: z.string() });
