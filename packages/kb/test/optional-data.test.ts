import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checkText } from '@koach/guard';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  FIT_WEIGHTS,
  joinOptionalStats,
  type KbBundle,
  type OptionalProfile,
  type OptionalStatYear,
  pooledSuccess,
  type QuizAnswers,
  rankOptionals,
  readKb,
  scoreOptional,
  type SuccessStats,
} from '../src';

const DATA = new URL('../data', import.meta.url).pathname;

let kb: KbBundle;
let profiles: Record<string, OptionalProfile>;
let years: OptionalStatYear[];

beforeAll(async () => {
  kb = await readKb(DATA);
  profiles = Object.fromEntries(
    kb.optionals.map((o) => [o.slug, o.profile as unknown as OptionalProfile]),
  );
  const raw = JSON.parse(await readFile(join(DATA, 'optionals', 'stats.json'), 'utf8')) as {
    years: OptionalStatYear[];
  };
  years = raw.years;
}, 60_000);

const statsFor = (): Record<string, SuccessStats> =>
  Object.fromEntries(kb.optionals.map((o) => [o.slug, pooledSuccess(o.stats)]));

describe('optional data on the committed files', () => {
  it('carries Political Science official rows end to end through readKb', () => {
    const psir = kb.optionals.find((o) => o.slug.startsWith('political-science'));
    expect(psir).toBeDefined();
    expect(psir?.stats).toHaveLength(6);
    const pooled = pooledSuccess(psir!.stats);
    expect(pooled.appeared).toBe(8927);
    expect(pooled.recommended).toBe(745);
    expect(pooled.smallSample).toBe(false);
  });

  describe('official stats (D-01, OPT-05)', () => {
    it('has 6 reports with distinct exam years from upsc.gov.in', () => {
      expect(years).toHaveLength(6);
      expect(new Set(years.map((y) => y.examYear)).size).toBe(6);
      for (const y of years) expect(y.source.startsWith('https://www.upsc.gov.in/')).toBe(true);
    });

    it('has integer pairs with 0 <= recommended <= appeared and no repeated slug per year', () => {
      for (const y of years) {
        expect(y.rows.length).toBeGreaterThanOrEqual(38);
        // 2016 lists literature-sindhi twice (5/1 and 1/0): the real report has two Sindhi script
        // rows. Pooling sums them correctly, so it is the one allowed repeat; any other is a bug.
        const repeats = y.rows
          .map((r) => r.slug)
          .filter((s, i, all) => all.indexOf(s) !== i)
          .filter((s) => !(y.examYear === 2016 && s === 'literature-sindhi'));
        expect(repeats).toEqual([]);
        for (const r of y.rows) {
          expect(Number.isInteger(r.appeared)).toBe(true);
          expect(Number.isInteger(r.recommended)).toBe(true);
          expect(r.recommended).toBeGreaterThanOrEqual(0);
          expect(r.recommended).toBeLessThanOrEqual(r.appeared);
        }
      }
    });

    it('resolves every row slug to exactly one profile', () => {
      expect(joinOptionalStats(profiles, years).unresolved).toEqual([]);
    });
  });

  describe('profiles (D-02)', () => {
    it('has 48 profiles with a matching syllabus file and topic count', () => {
      const slugs = Object.keys(profiles);
      expect(slugs).toHaveLength(48);
      for (const slug of slugs) {
        const file = kb.syllabus.find((f) => f.paper === `optional:${slug}`);
        expect(file, `syllabus for ${slug}`).toBeDefined();
        const topics = file!.nodes.filter((n) => n.kind === 'topic').length;
        expect(topics, `topic count for ${slug}`).toBe(profiles[slug]!.topics);
      }
    });

    it('has values in range, existing GS sections, and clean text', () => {
      const gsIds = new Set(
        kb.syllabus
          .filter((f) => !f.paper.startsWith('optional:'))
          .flatMap((f) => f.nodes.map((n) => n.id)),
      );
      const unit = (x: number) => typeof x === 'number' && x >= 0 && x <= 1;
      for (const [slug, p] of Object.entries(profiles)) {
        for (const v of [...Object.values(p.reading), ...Object.values(p.answer)])
          expect(unit(v), `${slug} reading/answer`).toBe(true);
        expect(unit(p.materials), `${slug} materials`).toBe(true);
        expect(unit(p.gsOverlap), `${slug} gsOverlap`).toBe(true);
        expect(Number.isInteger(p.hours), `${slug} hours int`).toBe(true);
        expect(p.hours).toBeGreaterThanOrEqual(100);
        expect(p.hours).toBeLessThanOrEqual(1200);
        for (const id of p.overlapSections) expect(gsIds.has(id), `${slug}: ${id}`).toBe(true);
        expect(checkText(p.summary), `${slug} summary`).toEqual([]);
        for (const book of p.books) expect(checkText(book), `${slug} book ${book}`).toEqual([]);
      }
    });
  });

  describe('fit score (D-03)', () => {
    it('keeps the locked weights', () => {
      expect(FIT_WEIGHTS).toEqual({
        interest: 0.3,
        background: 0.2,
        overlap: 0.15,
        writingStyle: 0.1,
        materials: 0.1,
        time: 0.1,
        stability: 0.05,
      });
      const sum = Object.values(FIT_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    });

    const engineer: QuizAnswers = {
      background: 'engineering',
      interests: ['mathematics', 'technology', 'physical sciences'],
      reading: ['data', 'theory'],
      answerStyle: ['numericals', 'diagrams'],
      hours: 450,
      languages: [],
      risk: 0.3,
    };
    const humanities: QuizAnswers = {
      background: 'humanities',
      interests: ['society', 'politics', 'history'],
      reading: ['debates', 'narratives'],
      answerStyle: ['analytical'],
      hours: 350,
      languages: [],
      risk: 0.3,
    };

    it('gives an engineering persona a plausible top 5', () => {
      const { top } = rankOptionals(profiles, engineer, statsFor());
      const slugs = top.map((t) => t.slug);
      const expected = [
        'mathematics',
        'statistics',
        'physics',
        'mechanical-engineering',
        'civil-engineering',
        'electrical-engineering',
        'geology',
        'chemistry',
      ];
      expect(
        slugs.some((s) => expected.includes(s)),
        `top 5: ${slugs.join(', ')}`,
      ).toBe(true);
    });

    it('gives a humanities persona a plausible top 5 and consistent surprising fits', () => {
      const { top, surprising } = rankOptionals(profiles, humanities, statsFor());
      const slugs = top.map((t) => t.slug);
      const expected = [
        'sociology',
        'political-science-and-international-rela',
        'history',
        'public-administration',
        'anthropology',
        'philosophy',
        'geography',
      ];
      expect(
        slugs.some((s) => expected.includes(s)),
        `top 5: ${slugs.join(', ')}`,
      ).toBe(true);
      for (const s of surprising) {
        expect(s.surprising).toBe(true);
        expect(top.map((t) => t.slug)).not.toContain(s.slug);
      }
    });

    it('lists literatures only when the language is given', () => {
      for (const answers of [engineer, humanities]) {
        const { top, surprising } = rankOptionals(profiles, answers, statsFor());
        for (const r of [...top, ...surprising])
          expect(r.slug.startsWith('literature-')).toBe(false);
      }
      const hindi = profiles['literature-hindi']!;
      expect(scoreOptional('literature-hindi', hindi, humanities, null, 0.08)).toBeNull();
      expect(
        scoreOptional(
          'literature-hindi',
          hindi,
          { ...humanities, languages: ['hindi'] },
          null,
          0.08,
        ),
      ).not.toBeNull();
    });

    it('returns finite scores in [0,1] for every optional', () => {
      const stats = statsFor();
      const rates = Object.values(stats)
        .map((s) => s.rate)
        .filter((r): r is number => r !== null);
      const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
      const allLangs = Object.keys(profiles)
        .filter((s) => s.startsWith('literature-'))
        .map((s) => s.slice('literature-'.length));
      for (const answers of [engineer, humanities]) {
        for (const [slug, p] of Object.entries(profiles)) {
          const r = scoreOptional(
            slug,
            p,
            { ...answers, languages: allLangs },
            stats[slug] ?? null,
            mean,
          );
          expect(r).not.toBeNull();
          expect(Number.isFinite(r!.score)).toBe(true);
          expect(r!.score).toBeGreaterThanOrEqual(0);
          expect(r!.score).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});
