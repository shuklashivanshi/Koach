import { type Card, createEmptyCard, fsrs, generatorParameters, type Grade, Rating } from 'ts-fsrs';

// FSRS spaced repetition (SRS-01). Target retention 0.9; no fuzz so plans are reproducible.

export type SrsGrade = 'again' | 'hard' | 'good' | 'easy';
export type SrsCard = Card;

const RATING: Record<SrsGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function scheduler(retention = 0.9) {
  return fsrs(generatorParameters({ request_retention: retention, enable_fuzz: false }));
}
const f = scheduler();

export const newCard = (now: Date): SrsCard => createEmptyCard(now);

export function grade(card: SrsCard, now: Date, g: SrsGrade): SrsCard {
  return f.next(card, now, RATING[g]).card;
}

/** Probability of recall now (1 for a card never reviewed yet). */
export function retrievability(card: SrsCard, now: Date): number {
  if (!card.last_review) return 1;
  const r: unknown = f.retrievability(card, now);
  return typeof r === 'number' ? r : Number.parseFloat(String(r)) / 100;
}

/**
 * SRS-03 forecast: review dates before `until` if every review on its due date is graded "good".
 */
export function forecastTouches(card: SrsCard, now: Date, until: Date, max = 12): Date[] {
  const out: Date[] = [];
  let c = card;
  let at = new Date(Math.max(now.getTime(), new Date(c.due).getTime()));
  while (at < until && out.length < max) {
    out.push(at);
    c = grade(c, at, 'good');
    at = new Date(c.due);
  }
  return out;
}

/** Card state as plain JSON for storage (dates as ISO strings). */
export const toJson = (c: SrsCard) => JSON.parse(JSON.stringify(c)) as Record<string, unknown>;
export function fromJson(j: Record<string, unknown>): SrsCard {
  return {
    ...(j as unknown as SrsCard),
    due: new Date(j.due as string),
    last_review: j.last_review ? new Date(j.last_review as string) : undefined,
  } as SrsCard;
}
