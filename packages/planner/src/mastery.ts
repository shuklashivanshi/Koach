// Node mastery (SRS-02): an exponentially weighted estimate from grades and check accuracy,
// shown decayed by how likely the learner is to recall it today.

export const GRADE_SCORE = { again: 0, hard: 0.5, good: 0.8, easy: 1 } as const;

export function updateMastery(current: number, observed: number, alpha = 0.3): number {
  const next = (1 - alpha) * current + alpha * Math.min(1, Math.max(0, observed));
  return Math.round(next * 1000) / 1000;
}

/** Heatmap value (PB-HEAT): mastery × retrievability. */
export const displayedMastery = (mastery: number, retrievability: number) =>
  Math.round(mastery * retrievability * 100) / 100;
