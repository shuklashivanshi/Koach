import { loadKb, readKb } from '@koach/kb';
import { CaNodeItems, CaResults, CaToday, MistakeList, TodayPlan } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import type { AiService } from '../src/services/ai';
import { type FetchFn, ingestCurrentAffairs, parseRss, titleKey } from '../src/services/ca';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;
const rss = (items: [string, string][]) =>
  `<rss><channel>${items.map(([t, l]) => `<item><title><![CDATA[${t}]]></title><link>${l}</link><pubDate>Fri, 06 Nov 2026 10:00:00 +0530</pubDate></item>`).join('')}</channel></rss>`;

const feeds: FetchFn = (url) =>
  Promise.resolve({
    ok: true,
    text: () =>
      Promise.resolve(
        url.includes('pib')
          ? rss([
              ['Cabinet approves amendment to equality law', 'https://pib.gov.in/PR?id=1'],
              ['Cabinet approves amendment to equality law', 'https://pib.gov.in/PR?id=2'], // duplicate title
            ])
          : url.includes('rbi.org.in/pressreleases')
            ? rss([['Government Stock - Auction Results: Cut-off', 'https://rbi.org.in/a']])
            : url.includes('sebi')
              ? rss([])
              : '<html><body><p>The amendment widens Article 14 protections.</p></body></html>',
      ),
  });

const ai = (verdictOk: boolean): AiService => ({
  text: () => Promise.reject(new Error('unused')),
  speak: () => Promise.reject(new Error('unused')),
  transcribe: () => Promise.reject(new Error('unused')),
  json: (req: { feature: string }) => {
    const data =
      req.feature === 'ca.analyse'
        ? {
            items: [
              {
                index: 0,
                relevance: 0.9,
                summary: 'Equality law widened; links to Article 14.',
                nodes: ['gs2.polity.fr.equality', 'bogus'],
              },
            ],
          }
        : req.feature === 'ca.quiz'
          ? {
              questions: [
                {
                  item: 0,
                  kind: 'statement',
                  stem: 'Consider the amendment…',
                  options: ['a', 'b', 'c', 'd'].map((k) => ({ key: k, text: `opt ${k}` })),
                  answer: 'b',
                  explanation: 'Per the release.',
                },
                {
                  item: 0,
                  kind: 'how_many',
                  stem: 'How many of the above…',
                  options: ['a', 'b', 'c', 'd'].map((k) => ({ key: k, text: `opt ${k}` })),
                  answer: 'a',
                  explanation: 'Per the release.',
                },
              ],
            }
          : {
              checks: [
                {
                  index: 0,
                  answer: 'b',
                  singleCorrect: true,
                  grounded: true,
                  unambiguous: verdictOk,
                },
                { index: 1, answer: 'c', singleCorrect: true, grounded: true, unambiguous: true }, // blind solve disagrees
              ],
            };
    return Promise.resolve({ data: data as never, model: 'fake', costUsd: 0 });
  },
});

describe('current affairs pipeline', () => {
  it('parses RSS and normalises titles', () => {
    expect(parseRss(rss([['A &amp; B', 'https://x/1']]), 'PIB')[0]).toMatchObject({
      title: 'A & B',
      url: 'https://x/1',
    });
    expect(titleKey('Cabinet approves: Amendment!')).toBe(titleKey('cabinet approves amendment'));
  });

  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  const now = new Date('2026-11-09T05:30:00+05:30');
  const h = bearer('u1', 'a@b.co');
  beforeEach(async () => {
    ctx = await buildTestApp({
      ai: ai(true),
      now: () => now,
      config: loadConfig({ APP_ENV: 'dev', CRON_SECRET: 'c' }),
    });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
  });
  afterEach(() => ctx.close());

  it('ingests once, drops routine and duplicate items, keeps only verified questions', async () => {
    const r = await ingestCurrentAffairs(ctx.deps.db, ctx.deps.ai, now, feeds);
    expect(r).toMatchObject({
      routine: 1,
      duplicates: 1,
      stored: 1,
      visible: 1,
      questions: 1,
      dropped: 1,
    });
    const again = await ingestCurrentAffairs(ctx.deps.db, ctx.deps.ai, now, feeds);
    expect(again).toMatchObject({ stored: 0, duplicates: 2 });
  });

  it('serves the quiz without answers, records results into mistakes, and pulls reported questions', async () => {
    await ingestCurrentAffairs(ctx.deps.db, ctx.deps.ai, now, feeds);
    const res = await ctx.app.inject({ method: 'GET', url: '/v1/ca/today', headers: h });
    const today = CaToday.parse(res.json());
    expect(today.items[0]?.nodes).toEqual([
      { id: 'gs2.polity.fr.equality', title: 'Right to Equality (Art 14–18)' },
    ]);
    expect(res.body).not.toContain('"answer"');
    const q = today.questions[0]!;
    const out = CaResults.parse(
      (
        await ctx.app.inject({
          method: 'POST',
          url: '/v1/ca/answers',
          headers: h,
          payload: { answers: [{ questionId: q.id, chosen: 'a' }] },
        })
      ).json(),
    );
    expect(out.results[0]).toMatchObject({ correct: false, answer: 'b' });
    const mistakes = MistakeList.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/mistakes', headers: h })).json(),
    );
    expect(mistakes.mistakes).toHaveLength(1);

    const node = CaNodeItems.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: '/v1/ca/node/gs2.polity.fr.equality',
          headers: h,
        })
      ).json(),
    );
    expect(node.items).toHaveLength(1);

    // Today's plan includes the CA task now that a quiz exists.
    await ctx.app.inject({
      method: 'PUT',
      url: '/v1/profile',
      headers: h,
      payload: {
        weekdayMinutes: [150, 150, 150, 150, 150, 300, 300],
        workHours: null,
        quietHours: null,
        selfAssessment: {},
      },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/diagnostic',
      headers: h,
      payload: { answers: [] },
    });
    const plan = TodayPlan.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/plan/today', headers: h })).json(),
    );
    expect(plan.tasks.map((t) => t.kind)).toContain('ca');

    await ctx.app.inject({
      method: 'POST',
      url: `/v1/ca/questions/${q.id}/report`,
      headers: h,
      payload: { reason: 'two answers' },
    });
    const after = CaToday.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: '/v1/ca/today',
          headers: bearer('u2', 'b@b.co'),
        })
      ).json(),
    );
    expect(after.questions).toHaveLength(0);
  });

  it('runs ingestion only with the scheduler secret', async () => {
    expect((await ctx.app.inject({ method: 'POST', url: '/internal/ca-ingest' })).statusCode).toBe(
      403,
    );
  });
});
