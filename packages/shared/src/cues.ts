import { z } from 'zod';

// Memory cues and coaching contracts (Phase 6).

export const CueFormats = [
  'palace',
  'mindmap',
  'timeline',
  'spoken',
  'chant',
  'mnemonic',
  'cuesheet',
  'cloze',
  'blurt',
  'sequence',
  'flowchart',
  'why',
] as const;
export type CueFormatName = (typeof CueFormats)[number];

export const CueResponse = z.object({
  /** ready = content present; palace = memory palace not set up; failed = no verified cue. */
  status: z.enum(['ready', 'palace', 'failed']),
  format: z.enum(CueFormats),
  cue: z
    .object({
      id: z.string(),
      nodeId: z.string(),
      format: z.enum(CueFormats),
      content: z.record(z.string(), z.unknown()),
      rating: z.number().int().nullable(),
    })
    .nullable(),
  /** Formats grouped by pattern, for the switcher (See / Hear / Write / Do / Why). */
  groups: z.array(z.object({ pattern: z.string(), formats: z.array(z.enum(CueFormats)) })),
});
export type CueResponse = z.infer<typeof CueResponse>;

export const RecallGrade = z.object({
  score: z.number(),
  feedback: z.string(),
  missed: z.array(z.string()),
});
export type RecallGrade = z.infer<typeof RecallGrade>;

export const Palace = z.object({
  rooms: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        loci: z.array(z.string().min(1).max(40)).min(1).max(10),
      }),
    )
    .max(6),
});
export type Palace = z.infer<typeof Palace>;

export const Playlist = z.object({
  tracks: z.array(z.object({ cueId: z.string(), nodeId: z.string(), title: z.string() })),
});
export type Playlist = z.infer<typeof Playlist>;

export const CoachState = z.object({
  note: z.object({ week: z.string(), lines: z.array(z.string()) }).nullable(),
  /** True when this week's well-being check-in is still to be answered. */
  checkInDue: z.boolean(),
  lighterWeek: z.boolean(),
});
export type CoachState = z.infer<typeof CoachState>;
export const CheckIn = z.object({ level: z.enum(['light', 'fine', 'heavy']) });
export const CardsAdded = z.object({ added: z.number().int() });
