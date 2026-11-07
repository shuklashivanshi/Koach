// Optional Discovery (OPT-01/02): transparent fit scoring and official success-rate maths.
// Weights are config, shown behind "Why?", and reviewable by a subject expert.

export const BACKGROUNDS = [
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
] as const;
export type Background = (typeof BACKGROUNDS)[number];

export const INTERESTS = [
  'society',
  'politics',
  'history',
  'economy',
  'environment',
  'technology',
  'mathematics',
  'life sciences',
  'physical sciences',
  'philosophy',
  'law',
  'management',
  'literature',
  'geography',
  'psychology',
  'statistics',
] as const;
export type Interest = (typeof INTERESTS)[number];

export const FIT_WEIGHTS = {
  interest: 0.3,
  background: 0.2,
  overlap: 0.15,
  writingStyle: 0.1,
  materials: 0.1,
  time: 0.1,
  stability: 0.05,
} as const;

export interface OptionalProfile {
  name: string;
  backgrounds: Background[];
  interests: Interest[];
  reading: { theory: number; data: number; narratives: number; debates: number };
  answer: { analytical: number; factual: number; diagrams: number; numericals: number };
  materials: number;
  hours: number;
  books: string[];
  summary: string;
  topics: number;
  gsOverlap: number;
  overlapSections: string[];
}

export interface QuizAnswers {
  background: Background;
  interests: Interest[];
  reading: (keyof OptionalProfile['reading'])[];
  answerStyle: (keyof OptionalProfile['answer'])[];
  /** Hours available for the optional before Mains. */
  hours: number;
  /** Literature languages the aspirant can write in comfortably (lowercase names). */
  languages: string[];
  /** 0 = prefers stable, well-trodden subjects; 1 = happy with a niche bet. */
  risk: number;
}

export interface SuccessStats {
  appeared: number;
  recommended: number;
  rate: number | null;
  low: number | null;
  high: number | null;
  years: number;
  smallSample: boolean;
}

/** Wilson score interval (95%). */
export function wilson(successes: number, n: number, z = 1.96): { low: number; high: number } {
  if (!n) return { low: 0, high: 0 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return {
    low: Math.max(0, (centre - margin) / denom),
    high: Math.min(1, (centre + margin) / denom),
  };
}

export function pooledSuccess(rows: { appeared: number; recommended: number }[]): SuccessStats {
  const appeared = rows.reduce((a, r) => a + r.appeared, 0);
  const recommended = rows.reduce((a, r) => a + r.recommended, 0);
  if (!appeared)
    return {
      appeared,
      recommended,
      rate: null,
      low: null,
      high: null,
      years: rows.length,
      smallSample: true,
    };
  const { low, high } = wilson(recommended, appeared);
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    appeared,
    recommended,
    rate: r3(recommended / appeared),
    low: r3(low),
    high: r3(high),
    years: rows.length,
    smallSample: appeared < 100,
  };
}

export interface FitResult {
  slug: string;
  name: string;
  score: number;
  components: Record<keyof typeof FIT_WEIGHTS, number>;
  reason: string;
  surprising: boolean;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const REASONS: Record<keyof typeof FIT_WEIGHTS, string> = {
  interest: 'matches what you enjoy',
  background: 'builds on your background',
  overlap: 'overlaps strongly with GS and Essay',
  writingStyle: 'suits how you like to write',
  materials: 'has good standard material',
  time: 'fits your available hours',
  stability: 'has steady results over the years',
};

export function scoreOptional(
  slug: string,
  p: OptionalProfile,
  a: QuizAnswers,
  stats: SuccessStats | null,
  meanRate: number,
): FitResult | null {
  // Literature optionals need the language.
  if (slug.startsWith('literature-')) {
    const lang = slug.slice('literature-'.length);
    if (!a.languages.includes(lang)) return null;
  }
  const interest = a.interests.length
    ? a.interests.filter((i) => p.interests.includes(i)).length / Math.min(3, a.interests.length)
    : 0;
  const background = p.backgrounds.includes(a.background)
    ? 1
    : p.backgrounds.includes('any')
      ? 0.6
      : 0.2;
  const writing = avg([
    ...a.reading.map((r) => p.reading[r]),
    ...a.answerStyle.map((s) => p.answer[s]),
  ]);
  const time = p.hours <= a.hours ? 1 : Math.max(0, 1 - (p.hours - a.hours) / Math.max(1, a.hours));
  // Stability: closeness to the overall mean, so niche outliers count less for low-risk takers.
  const stability =
    stats?.rate == null
      ? 0.5
      : stats.smallSample
        ? 0.3 + 0.4 * a.risk
        : 1 -
          Math.min(1, Math.abs(stats.rate - meanRate) / Math.max(0.01, meanRate)) * (1 - a.risk);
  const components = {
    interest: Math.min(1, interest),
    background,
    overlap: p.gsOverlap,
    writingStyle: writing,
    materials: p.materials,
    time,
    stability,
  };
  const score = (Object.keys(FIT_WEIGHTS) as (keyof typeof FIT_WEIGHTS)[]).reduce(
    (s, k) => s + FIT_WEIGHTS[k] * components[k],
    0,
  );
  const top = (Object.keys(components) as (keyof typeof FIT_WEIGHTS)[])
    .sort((x, y) => FIT_WEIGHTS[y] * components[y] - FIT_WEIGHTS[x] * components[x])
    .slice(0, 2);
  return {
    slug,
    name: p.name,
    score: Math.round(score * 1000) / 1000,
    components,
    reason: `${p.name} ${REASONS[top[0]!]} and ${REASONS[top[1]!]}.`,
    surprising: background <= 0.2,
  };
}

export function rankOptionals(
  profiles: Record<string, OptionalProfile>,
  answers: QuizAnswers,
  stats: Record<string, SuccessStats>,
): { top: FitResult[]; surprising: FitResult[] } {
  const rates = Object.values(stats)
    .map((s) => s.rate)
    .filter((r): r is number => r !== null);
  const meanRate = avg(rates) || 0.08;
  const all = Object.entries(profiles)
    .map(([slug, p]) => scoreOptional(slug, p, answers, stats[slug] ?? null, meanRate))
    .filter((r): r is FitResult => !!r)
    .sort((x, y) => y.score - x.score);
  const top = all.slice(0, 5);
  const surprising = all.filter((r) => r.surprising && !top.includes(r)).slice(0, 2);
  return { top, surprising };
}

/**
 * Minimum length of a profile slug before it may act as a prefix of a stats slug. The syllabus
 * generator truncates optional slugs to 40 characters, so only long (truncated) slugs can be
 * prefixes; short ones such as "law" must never match by prefix.
 */
const MIN_PREFIX_SLUG = 30;

/**
 * Maps a slug from the annual-report stats to a profile slug: exact match first, otherwise the
 * single profile slug (>= 30 chars) that is a prefix of it. Null when none or ambiguous.
 */
export function resolveOptionalSlug(statSlug: string, profileSlugs: string[]): string | null {
  if (profileSlugs.includes(statSlug)) return statSlug;
  const candidates = profileSlugs.filter(
    (p) => p.length >= MIN_PREFIX_SLUG && statSlug.startsWith(p),
  );
  return candidates.length === 1 ? candidates[0]! : null;
}

export interface OptionalStatYear {
  examYear: number;
  source: string;
  rows: { slug: string; appeared: number; recommended: number }[];
}

export interface JoinedOptional<P> {
  slug: string;
  profile: P;
  stats: { examYear: number; appeared: number; recommended: number; source: string }[];
}

/** Attaches each annual-report row to its profile by canonical slug (see resolveOptionalSlug). */
export function joinOptionalStats<P>(
  profiles: Record<string, P>,
  years: OptionalStatYear[],
): { optionals: JoinedOptional<P>[]; unresolved: string[] } {
  const slugs = Object.keys(profiles);
  const bySlug = new Map<string, JoinedOptional<P>['stats']>(slugs.map((s) => [s, []]));
  const unresolved = new Set<string>();
  for (const y of years) {
    for (const r of y.rows) {
      const target = resolveOptionalSlug(r.slug, slugs);
      if (!target) {
        unresolved.add(r.slug);
        continue;
      }
      bySlug.get(target)!.push({
        examYear: y.examYear,
        appeared: r.appeared,
        recommended: r.recommended,
        source: y.source,
      });
    }
  }
  return {
    optionals: slugs.map((slug) => ({ slug, profile: profiles[slug]!, stats: bySlug.get(slug)! })),
    unresolved: [...unresolved],
  };
}
