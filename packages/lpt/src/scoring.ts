import type { EventCard, Place } from './banks';

// Scoring for the Learning Pattern Test (LPT-02). Every game score is normalised to 0..1.

export type Pattern = 'visual' | 'auditory' | 'readwrite' | 'kinesthetic';
export const Patterns: readonly Pattern[] = ['visual', 'auditory', 'readwrite', 'kinesthetic'];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Map Pins: 1 at a perfect placement, 0 at ≥ maxKm average error (missing pins count as max). */
export function scoreMapPins(
  places: Place[],
  placed: Record<string, { lat: number; lon: number } | undefined>,
  maxKm = 800,
): number {
  if (!places.length) return 0;
  const errors = places.map((p) => {
    const guess = placed[p.name];
    return guess ? Math.min(maxKm, distanceKm(p, guess)) : maxKm;
  });
  return clamp01(1 - errors.reduce((a, b) => a + b, 0) / errors.length / maxKm);
}

/** Pattern Grid: longest sequence reproduced exactly, as a share of the longest offered. */
export function scoreGrid(sequences: number[][], answers: number[][]): number {
  let best = 0;
  sequences.forEach((seq, i) => {
    const a = answers[i];
    if (a && a.length === seq.length && a.every((c, j) => c === seq[j]))
      best = Math.max(best, seq.length);
  });
  const max = Math.max(0, ...sequences.map((s) => s.length));
  return max ? best / max : 0;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/article/g, 'art')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Listen & Recall: share of items recalled across lists, any order, case-insensitive. */
export function scoreRecallLists(lists: string[][], answers: string[]): number {
  let hit = 0;
  let total = 0;
  lists.forEach((list, i) => {
    const said = ` ${norm(answers[i] ?? '')} `;
    for (const item of list) {
      total++;
      if (said.includes(` ${norm(item)} `)) hit++;
    }
  });
  return total ? hit / total : 0;
}

/** Arrange: Kendall-tau style share of correctly ordered pairs (0..1). */
export function scoreOrder(events: EventCard[], answer: string[]): number {
  const year = new Map(events.map((e) => [e.label, e.year]));
  const seq = answer.map((l) => year.get(l)).filter((y): y is number => y !== undefined);
  if (seq.length < 2 || seq.length !== events.length) return 0;
  let good = 0;
  let pairs = 0;
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + 1; j < seq.length; j++) {
      pairs++;
      if (seq[i]! < seq[j]!) good++;
    }
  }
  return good / pairs;
}

export interface GameScores {
  mapPins: number;
  grid: number;
  listen: number;
  readWrite: number;
  arrange: number;
}

/** Per-pattern 0–100: 0.6 × immediate + 0.4 × delayed. Visual averages Map Pins and Grid. */
export function patternScores(
  immediate: GameScores,
  delayed: Partial<GameScores>,
): Record<Pattern, number> {
  const blend = (now: number, later: number | undefined) =>
    Math.round(100 * clamp01(0.6 * now + 0.4 * (later ?? now * 0.5)));
  const visualNow = (immediate.mapPins + immediate.grid) / 2;
  const visualLater =
    delayed.mapPins === undefined && delayed.grid === undefined
      ? undefined
      : ((delayed.mapPins ?? 0) + (delayed.grid ?? delayed.mapPins ?? 0)) / 2;
  return {
    visual: blend(visualNow, visualLater),
    auditory: blend(immediate.listen, delayed.listen),
    readwrite: blend(immediate.readWrite, delayed.readWrite),
    kinesthetic: blend(immediate.arrange, delayed.arrange),
  };
}

const phrases: Record<Pattern, { text: string; verb: string }> = {
  visual: { text: 'pictures and places', verb: 'stick' },
  auditory: { text: 'what you hear', verb: 'sticks' },
  readwrite: { text: 'what you read and write', verb: 'sticks' },
  kinesthetic: { text: 'what you arrange by hand', verb: 'sticks' },
};

/** One plain line for the profile; names the strongest pattern, never labels the person. */
export function profileLine(scores: Record<Pattern, number>): string {
  const ranked = [...Patterns].sort((a, b) => scores[b] - scores[a]);
  const [top, second] = ranked as [Pattern, Pattern];
  const lead = phrases[top];
  const sentence = `${lead.text.charAt(0).toUpperCase()}${lead.text.slice(1)} ${lead.verb} best for you`;
  if (scores[top] - scores[second] <= 5) {
    return `${sentence}, with ${phrases[second].text} close behind.`;
  }
  return `${sentence}.`;
}

/** LPT-03: nudge a pattern score toward observed recall success (0..1) on cues of that pattern. */
export function applyEvidence(score: number, success: number, k = 0.05): number {
  return (
    Math.round(Math.min(100, Math.max(0, score + k * (100 * clamp01(success) - score))) * 10) / 10
  );
}

export const RETEST_DAYS = 56;
export function retestDue(takenAt: Date): Date {
  return new Date(takenAt.getTime() + RETEST_DAYS * 86_400_000);
}
