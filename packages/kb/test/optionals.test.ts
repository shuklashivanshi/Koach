import { describe, expect, it } from 'vitest';
import {
  type OptionalProfile,
  pooledSuccess,
  type QuizAnswers,
  rankOptionals,
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
