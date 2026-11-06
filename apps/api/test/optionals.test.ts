import { loadKb, readKb } from '@koach/kb';
import {
  CoachReply,
  DecisionStatus,
  FitRanking,
  OptionalExplorer,
  OptionalList,
  TodayPlan,
} from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;

describe('optional discovery', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  const prompts: string[] = [];
  const ai: AiService = {
    text: () => Promise.reject(new Error('unused')),
    speak: () => Promise.reject(new Error('unused')),
    transcribe: () => Promise.reject(new Error('unused')),
    json: (req: { prompt: string }) => {
      prompts.push(req.prompt);
      return Promise.resolve({
        data: {
          answer: 'Sociology overlaps with GS; its official rate is about 7%.',
          stressTest: 'Write 3 lines on research methods.',
        } as never,
        model: 'f',
        costUsd: 0,
      });
    },
  };
  const h = bearer('u1', 'a@b.co');
  const call = (method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) =>
    ctx.app.inject({ method, url, headers: h, ...(payload ? { payload } : {}) });
  beforeEach(async () => {
    prompts.length = 0;
    ctx = await buildTestApp({ ai, now: () => new Date('2026-12-05T08:00:00+05:30') });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    await call('PUT', '/v1/profile', {
      weekdayMinutes: [150, 150, 150, 150, 150, 300, 300],
      workHours: null,
      quietHours: null,
      selfAssessment: {},
    });
    await call('POST', '/v1/diagnostic', { answers: [] });
  });
  afterEach(() => ctx.close());

  it('lists optionals with pooled official success and a Wilson band', async () => {
    const list = OptionalList.parse((await call('GET', '/v1/optionals')).json());
    const soc = list.optionals[0]!;
    expect(soc.success).toMatchObject({
      appeared: 2300,
      recommended: 170,
      years: 2,
      smallSample: false,
    });
    expect(soc.success.low!).toBeLessThan(soc.success.rate!);
    const ex = OptionalExplorer.parse((await call('GET', '/v1/optionals/item/sociology')).json());
    expect(ex.topics).toEqual(['Sociology as a discipline', 'Research methods']);
    expect(ex.overlapsWith).toEqual(['Indian Constitution and Polity']);
    expect(ex.sources).toHaveLength(2);
  });

  it('ranks by fit with weights behind Why?, and the coach answers from the evidence with the deadline', async () => {
    const r = FitRanking.parse(
      (
        await call('POST', '/v1/optionals/quiz', {
          background: 'engineering',
          interests: ['society'],
          reading: ['debates'],
          answerStyle: ['analytical'],
          hours: 400,
          languages: [],
          risk: 0.3,
        })
      ).json(),
    );
    expect(r.top[0]?.slug).toBe('sociology');
    expect(r.weights.interest).toBe(0.3);
    const reply = CoachReply.parse(
      (
        await call('POST', '/v1/optionals/coach', {
          question: 'Is sociology scoring?',
          slugs: ['sociology'],
        })
      ).json(),
    );
    expect(reply.stressTest).toMatch(/research methods/);
    expect(prompts[0]).toContain('official success 7.4%');
    expect(prompts[0]).toContain('2026-12-15, 10 days left');
    expect(prompts[0]).toContain('"background":"engineering"');
  });

  it('records the choice and adds the optional to the plan', async () => {
    const status = DecisionStatus.parse(
      (
        await call('POST', '/v1/optionals/choice', {
          slug: 'sociology',
          reasons: 'Overlap with GS and I enjoy it.',
        })
      ).json(),
    );
    expect(status).toMatchObject({ chosen: 'sociology', daysLeft: 10 });
    // Fill a long day so optional units fit after GS nodes.
    await call('PUT', '/v1/profile', {
      weekdayMinutes: [600, 600, 600, 600, 600, 600, 600],
      workHours: null,
      quietHours: null,
      selfAssessment: {},
    });
    const plan = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    expect(plan.tasks.some((t) => t.nodeId === 'opt.sociology.p1.t01')).toBe(true);
    expect(
      (await call('POST', '/v1/optionals/choice', { slug: 'nope', reasons: 'xyz' })).statusCode,
    ).toBe(404);
  });
});
