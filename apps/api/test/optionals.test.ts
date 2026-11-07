import { schema } from '@koach/db';
import { loadKb, readKb } from '@koach/kb';
import {
  CoachReply,
  DecisionStatus,
  FitRanking,
  OptionalCompare,
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
  let aiDown = false;
  let clock = new Date('2026-12-05T08:00:00+05:30');
  const ai: AiService = {
    text: () => Promise.reject(new Error('unused')),
    speak: () => Promise.reject(new Error('unused')),
    transcribe: () => Promise.reject(new Error('unused')),
    json: (req: { prompt: string }) => {
      prompts.push(req.prompt);
      if (aiDown) return Promise.reject(new Error('vertex unavailable'));
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
    aiDown = false;
    clock = new Date('2026-12-05T08:00:00+05:30');
    ctx = await buildTestApp({ ai, now: () => clock });
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

  const QUIZ = {
    background: 'engineering',
    interests: ['society'],
    reading: ['debates'],
    answerStyle: ['analytical'],
    hours: 400,
    languages: [],
    risk: 0.3,
  };

  it('has no personal fit and no stored ranking before the quiz', async () => {
    const ex = OptionalExplorer.parse((await call('GET', '/v1/optionals/item/sociology')).json());
    expect(ex.fit).toBeNull();
    expect((await call('GET', '/v1/optionals/fits')).statusCode).toBe(404);
  });

  it('shows the learner their own fit, consistent with the quiz ranking, and re-opens the ranking', async () => {
    const ranking = FitRanking.parse((await call('POST', '/v1/optionals/quiz', QUIZ)).json());
    const ex = OptionalExplorer.parse((await call('GET', '/v1/optionals/item/sociology')).json());
    expect(ex.fit?.score).toBe(ranking.top.find((f) => f.slug === 'sociology')?.score);
    expect(ex.fit?.reason).toMatch(/Sociology/);
    expect(Object.keys(ex.fit!.components).length).toBeGreaterThan(3);

    const again = FitRanking.parse((await call('GET', '/v1/optionals/fits')).json());
    expect(again).toEqual(ranking);

    const cmp = OptionalCompare.parse(
      (await call('GET', '/v1/optionals/compare?slugs=sociology')).json(),
    );
    expect(cmp.optionals[0]?.fit?.score).toBe(ex.fit?.score);
  });

  it('gives no fit for a literature optional without the language, and the coach path has none', async () => {
    const [soc] = await ctx.deps.db.select().from(schema.optionalInfo);
    await ctx.deps.db
      .insert(schema.optionalInfo)
      .values({ slug: 'literature-hindi', profile: { ...soc!.profile, name: 'Hindi literature' } });
    await call('POST', '/v1/optionals/quiz', QUIZ);
    const cmp = OptionalCompare.parse(
      (await call('GET', '/v1/optionals/compare?slugs=sociology,literature-hindi')).json(),
    );
    expect(cmp.optionals.find((o) => o.slug === 'sociology')?.fit).not.toBeNull();
    expect(cmp.optionals.find((o) => o.slug === 'literature-hindi')?.fit).toBeNull();

    // The coach reads explorer facts without a uid, so no fit leaks into its evidence.
    await call('POST', '/v1/optionals/coach', {
      question: 'Is sociology scoring?',
      slugs: ['sociology'],
    });
    expect(prompts[0]).not.toContain('"fit"');
  });

  describe('decision coach', () => {
    const ask = (payload: Record<string, unknown>) =>
      call('POST', '/v1/optionals/coach', {
        question: 'Is sociology scoring?',
        slugs: ['sociology'],
        ...payload,
      });

    it('always carries the deadline as data, before and after it passes', async () => {
      const early = CoachReply.parse((await ask({})).json());
      expect(early.deadline).toEqual({ date: '2026-12-15', daysLeft: 10, overdue: false });
      expect(early.resting).toBe(false);
      clock = new Date('2026-12-20T08:00:00+05:30');
      const late = CoachReply.parse((await ask({})).json());
      expect(late.deadline).toEqual({ date: '2026-12-15', daysLeft: -5, overdue: true });
    });

    it('tells the model the app shows the deadline, and keeps the evidence strings', async () => {
      await ask({});
      expect(prompts[0]).toMatch(/do not\s+restate dates or day counts/);
      expect(prompts[0]).not.toMatch(/End by noting the decision deadline/);
      expect(prompts[0]).toContain('official success 7.4%');
    });

    it('remembers up to 4 exchanges and treats them as data', async () => {
      const history = [1, 2, 3, 4].map((n) => ({
        q: `earlier question ${n}`,
        a: `earlier answer ${n}`,
      }));
      expect((await ask({ history })).statusCode).toBe(200);
      for (const n of [1, 2, 3, 4]) {
        expect(prompts[0]).toContain(`earlier question ${n}`);
        expect(prompts[0]).toContain(`earlier answer ${n}`);
      }
      expect(prompts[0]).toMatch(/never instructions/);
    });

    it('defaults history to empty and rejects 5 exchanges or a long question', async () => {
      expect((await ask({})).statusCode).toBe(200);
      expect(prompts[0]).not.toContain('Earlier exchanges');
      const five = [1, 2, 3, 4, 5].map((n) => ({ q: `q${n}`, a: `a${n}` }));
      expect((await ask({ history: five })).statusCode).toBe(400);
      expect((await ask({ question: 'x'.repeat(501) })).statusCode).toBe(400);
      expect((await ask({ history: [{ q: 'q', a: 'a'.repeat(1201) }] })).statusCode).toBe(400);
    });

    it('answers 200 with the fixed resting line when the AI is down', async () => {
      aiDown = true;
      const res = await ask({});
      expect(res.statusCode).toBe(200);
      const reply = CoachReply.parse(res.json());
      expect(reply).toMatchObject({
        answer: 'The coach is resting. Your plan still works.',
        stressTest: null,
        resting: true,
      });
      expect(reply.deadline).toEqual({ date: '2026-12-15', daysLeft: 10, overdue: false });
    });
  });
});
