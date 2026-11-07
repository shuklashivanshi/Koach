// Pure helpers for the optional discovery screens (no React).

export const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);

/** Fit as 1 to 5 dots: round(score x 5), clamped. */
export const fitDots = (score: number) => Math.min(5, Math.max(1, Math.round(score * 5)));

const LABELS: Record<string, string> = {
  interest: 'What you enjoy',
  background: 'Your degree',
  overlap: 'GS and Essay overlap',
  writingStyle: 'Writing style',
  materials: 'Books and papers',
  time: 'Your hours',
  stability: 'Steady results',
};

/** Plain words for a fit component key; unknown keys come back as they are. */
export const componentLabel = (key: string) => LABELS[key] ?? key;

export type CompareItem = {
  slug: string;
  hours: number;
  topicsCount: number;
  gsOverlap: number;
  materials: number;
  success: { rate: number | null; smallSample: boolean };
  /** The learner's fit score, or null before the quiz. */
  fit: number | null;
};

export type BestRow = 'hours' | 'units' | 'gsOverlap' | 'success' | 'materials' | 'fit';

const EPS = 1e-9;

function winners(
  entries: { slug: string; value: number }[],
  better: 'low' | 'high',
  minEntries = 2,
): string[] {
  if (entries.length < minEntries) return [];
  const values = entries.map((e) => e.value);
  const best = better === 'low' ? Math.min(...values) : Math.max(...values);
  const worst = better === 'low' ? Math.max(...values) : Math.min(...values);
  if (Math.abs(best - worst) < EPS) return [];
  return entries.filter((e) => Math.abs(e.value - best) < EPS).map((e) => e.slug);
}

/**
 * For each comparison row, the slugs holding the best value. Ties all win; a row where every
 * value is the same marks nobody. Success is only decided among non-small samples that have a
 * rate (and needs at least two of them), and fit only when every item has one.
 */
export function bestPerRow(items: CompareItem[]): Record<BestRow, string[]> {
  const eligible = items.filter((i) => i.success.rate !== null && !i.success.smallSample);
  const allFit = items.length > 0 && items.every((i) => i.fit !== null);
  return {
    hours: winners(
      items.map((i) => ({ slug: i.slug, value: i.hours })),
      'low',
    ),
    units: winners(
      items.map((i) => ({ slug: i.slug, value: i.topicsCount })),
      'low',
    ),
    gsOverlap: winners(
      items.map((i) => ({ slug: i.slug, value: i.gsOverlap })),
      'high',
    ),
    materials: winners(
      items.map((i) => ({ slug: i.slug, value: i.materials })),
      'high',
    ),
    success: winners(
      eligible.map((i) => ({ slug: i.slug, value: i.success.rate as number })),
      'high',
    ),
    fit: allFit
      ? winners(
          items.map((i) => ({ slug: i.slug, value: i.fit as number })),
          'high',
        )
      : [],
  };
}
