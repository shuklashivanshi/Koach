import type { Pattern } from './scoring';

// Cue formats by learning pattern (research/LEARNING-PATTERNS.md §3) and the default-format rule
// (CUE-08): ~60% strongest pattern, 25% second, 15% split across the others.

export type CueFormat =
  | 'palace'
  | 'mindmap'
  | 'timeline'
  | 'spoken'
  | 'chant'
  | 'mnemonic'
  | 'cuesheet'
  | 'cloze'
  | 'blurt'
  | 'sequence'
  | 'flowchart'
  | 'why';

export const FORMATS: Record<Pattern | 'everyone', CueFormat[]> = {
  visual: ['palace', 'mindmap', 'timeline'],
  auditory: ['spoken', 'chant', 'mnemonic'],
  readwrite: ['cuesheet', 'cloze', 'blurt'],
  kinesthetic: ['sequence', 'flowchart'],
  everyone: ['why'],
};

export const patternOf = (f: CueFormat): Pattern | 'everyone' =>
  (Object.keys(FORMATS) as (Pattern | 'everyone')[]).find((p) => FORMATS[p].includes(f)) ??
  'everyone';

/** Deterministic 0..1 from a string (same node and day → same choice). */
export function unitHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

export function chooseFormat(scores: Record<Pattern, number> | null, seed: string): CueFormat {
  const u = unitHash(seed);
  if (!scores) return FORMATS.readwrite[0]!;
  const ranked = (Object.keys(scores) as Pattern[]).sort((a, b) => scores[b] - scores[a]);
  const pattern =
    u < 0.6
      ? ranked[0]!
      : u < 0.85
        ? ranked[1]!
        : (ranked[2 + Math.floor((u - 0.85) / 0.075)] ?? ranked[3]!);
  const options = FORMATS[pattern];
  return options[Math.floor(unitHash(`${seed}:f`) * options.length)] ?? options[0]!;
}
