import { describe, expect, it } from 'vitest';
import {
  joinOptionalStats,
  type OptionalProfile,
  pooledSuccess,
  type QuizAnswers,
  rankOptionals,
  resolveOptionalSlug,
  wilson,
} from '../src';

const profile = (over: Partial<OptionalProfile>): OptionalProfile => ({
  name: 'X',
  backgrounds: ['any'],
  interests: [],
  reading: { theory: 0.5, data: 0.5, narratives: 0.5, debates: 0.5 },
  answer: { analytical: 0.5, factual: 0.5, diagrams: 0.5, numericals: 0.5 },
  materials: 0.8,
  hours: 300,
  books: [],
  summary: '',
  topics: 20,
  gsOverlap: 0.5,
  overlapSections: [],
  ...over,
});

const answers: QuizAnswers = {
  background: 'engineering',
  interests: ['society', 'politics'],
  reading: ['debates'],
  answerStyle: ['analytical'],
  hours: 350,
  languages: [],
  risk: 0.3,
};

describe('optional discovery maths', () => {
  it('computes a Wilson band and flags small samples', () => {
    const w = wilson(10, 100);
    expect(w.low).toBeGreaterThan(0.05);
    expect(w.high).toBeLessThan(0.18);
    const s = pooledSuccess([
      { appeared: 40, recommended: 6 },
      { appeared: 30, recommended: 2 },
    ]);
    expect(s).toMatchObject({ appeared: 70, recommended: 8, smallSample: true });
    expect(pooledSuccess([]).rate).toBeNull();
  });

  it('ranks by the weighted fit, explains it, and skips literatures without the language', () => {
    const profiles = {
      sociology: profile({
        name: 'Sociology',
        interests: ['society', 'politics'],
        reading: { theory: 0.6, data: 0.4, narratives: 0.6, debates: 0.9 },
        answer: { analytical: 0.9, factual: 0.4, diagrams: 0.3, numericals: 0 },
      }),
      mathematics: profile({
        name: 'Mathematics',
        backgrounds: ['engineering', 'science'],
        interests: ['mathematics'],
        gsOverlap: 0.05,
        hours: 500,
      }),
      'literature-hindi': profile({ name: 'Hindi Literature', interests: ['literature'] }),
    };
    const stats = {
      sociology: pooledSuccess([{ appeared: 2000, recommended: 160 }]),
      mathematics: pooledSuccess([{ appeared: 400, recommended: 40 }]),
    };
    const r = rankOptionals(profiles, answers, stats);
    expect(r.top.map((x) => x.slug)).toEqual(['sociology', 'mathematics']);
    expect(r.top[0]?.reason).toMatch(/^Sociology /);
    expect(r.top[0]?.surprising).toBe(false);
    expect(
      rankOptionals(profiles, { ...answers, languages: ['hindi'] }, stats).top.map((x) => x.slug),
    ).toContain('literature-hindi');
  });
});

describe('optional slug resolution', () => {
  const LONG = 'political-science-and-international-rela';
  const FULL = 'political-science-and-international-relations';

  it('prefers an exact match', () => {
    expect(resolveOptionalSlug('sociology', ['sociology'])).toBe('sociology');
  });

  it('resolves a stats slug to the one truncated profile slug that prefixes it', () => {
    expect(resolveOptionalSlug(FULL, [LONG, 'sociology'])).toBe(LONG);
  });

  it('returns null with no match, and never guesses between two prefixes', () => {
    expect(resolveOptionalSlug('geology', ['sociology'])).toBeNull();
    expect(resolveOptionalSlug(FULL, [LONG, LONG.slice(0, 35)])).toBeNull();
  });

  it('never lets a short profile slug act as a prefix', () => {
    expect(resolveOptionalSlug('law-and-order-studies-in-detail-extra-long', ['law'])).toBeNull();
  });

  it('joins every year onto the resolved profile and lists unresolved stats slugs once', () => {
    const profiles = { [LONG]: { name: 'PSIR' }, sociology: { name: 'Sociology' } };
    const { optionals, unresolved } = joinOptionalStats(profiles, [
      {
        examYear: 2020,
        source: 'https://www.upsc.gov.in/a.pdf',
        rows: [
          { slug: FULL, appeared: 100, recommended: 10 },
          { slug: 'sociology', appeared: 50, recommended: 5 },
          { slug: 'unknown-thing', appeared: 5, recommended: 0 },
        ],
      },
      {
        examYear: 2021,
        source: 'https://www.upsc.gov.in/b.pdf',
        rows: [
          { slug: FULL, appeared: 90, recommended: 9 },
          { slug: 'unknown-thing', appeared: 4, recommended: 0 },
        ],
      },
    ]);
    const psir = optionals.find((o) => o.slug === LONG);
    expect(psir?.stats).toEqual([
      { examYear: 2020, appeared: 100, recommended: 10, source: 'https://www.upsc.gov.in/a.pdf' },
      { examYear: 2021, appeared: 90, recommended: 9, source: 'https://www.upsc.gov.in/b.pdf' },
    ]);
    expect(optionals.find((o) => o.slug === 'sociology')?.stats).toHaveLength(1);
    expect(unresolved).toEqual(['unknown-thing']);
  });
});
