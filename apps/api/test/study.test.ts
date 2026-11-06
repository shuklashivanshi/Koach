import { loadKb, readKb } from '@koach/kb';
import {
  DueCards,
  GradeResponse,
  Heatmap,
  LearnOutcome,
  LearnSession,
  MistakeList,
  TodayPlan,
} from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;

const ai: AiService = {
  text: () => Promise.reject(new Error('unused')),
  speak: () => Promise.reject(new Error('unused')),
  transcribe: () => Promise.reject(new Error('unused')),
  json: (req: { feature: string }) =>
    Promise.resolve({
      data: (req.feature === 'learn.recall.generate'
        ? { items: [1, 2, 3, 4, 5].map((i) => ({ q: `Q${i}?`, a: `A${i}` })) }
        : { ok: [true, true, true, false, true] }) as never,
      model: 'fake',
      costUsd: 0,
    }),
};

describe('daily loop', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  // A Monday in the Foundation phase.
  let now = new Date('2026-11-09T07:00:00+05:30');
  beforeEach(async () => {
    now = new Date('2026-11-09T07:00:00+05:30');
    ctx = await buildTestApp({ ai, now: () => now });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    await ctx.app.inject({
      method: 'PUT',
      url: '/v1/profile',
      headers: h,
      payload: {
        target: 'cse-2027',
        weekdayMinutes: [150, 150, 150, 150, 150, 300, 300],
        workHours: null,
        quietHours: null,
        selfAssessment: { polity: 'some' },
      },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/diagnostic',
      headers: h,
      payload: { answers: [] },
    });
  });
  afterEach(() => ctx.close());
  const h = bearer('u1', 'a@b.co');
  const call = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
    ctx.app.inject({ method, url, headers: h, ...(payload ? { payload } : {}) });

  it('builds a stable plan that fits the day and names the source for Learn tasks', async () => {
    const plan = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    expect(plan.minutes).toBe(150);
    expect(plan.tasks.reduce((a, t) => a + t.minutes, 0)).toBeLessThanOrEqual(150);
    const learn = plan.tasks.filter((t) => t.kind === 'learn');
    expect(learn.length).toBeGreaterThan(0);
    expect(learn[0]?.source).toContain('·');
    expect(plan.daysToPrelims).toBeGreaterThan(190);
    const again = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    expect(again.tasks.map((t) => t.id)).toEqual(plan.tasks.map((t) => t.id));
  });

  it('runs a PYQ-first Learn session, then schedules revision and logs mistakes', async () => {
    const session = LearnSession.parse(
      (await call('GET', '/v1/learn/gs2.polity.fr.equality')).json(),
    );
    expect(session.pyqs.map((p) => p.id)).toContain('pre-2023-gs1-q001');
    expect(session.source?.chapter).toBe('Ch 7 · Fundamental Rights');
    expect(session.goal).toMatch(/^Finish Ch 7/);
    expect(session.recall).toHaveLength(4); // one item failed verification
    expect(JSON.stringify(session)).not.toContain('"answer"');

    const out = LearnOutcome.parse(
      (
        await call('POST', '/v1/learn/gs2.polity.fr.equality', {
          recall: session.recall.map((r, i) => ({ ...r, got: i > 0 })),
          answers: [{ pyqId: 'pre-2023-gs1-q001', chosen: 'b' }],
        })
      ).json(),
    );
    expect(out.results).toEqual([{ pyqId: 'pre-2023-gs1-q001', correct: false, answer: 'a' }]);

    const due = DueCards.parse((await call('GET', '/v1/reviews/due')).json());
    // node unit + 1 missed recall + 1 mistake
    expect(due.cards.map((c) => c.kind).sort()).toEqual(['mistake', 'node', 'recall']);
    const graded = GradeResponse.parse(
      (await call('POST', `/v1/reviews/${due.cards[0]!.id}`, { grade: 'good' })).json(),
    );
    expect(new Date(graded.due).getTime()).toBeGreaterThan(now.getTime());

    const mistakes = MistakeList.parse((await call('GET', '/v1/mistakes')).json());
    expect(mistakes.mistakes).toHaveLength(1);
    await call('POST', `/v1/mistakes/${mistakes.mistakes[0]!.id}/cause`, { cause: 'misread' });
    expect(MistakeList.parse((await call('GET', '/v1/mistakes')).json()).traps).toEqual({
      misread: 1,
    });

    const heat = Heatmap.parse((await call('GET', '/v1/mastery')).json());
    expect(heat.sections.find((s) => s.sectionId === 'gs2.polity')?.studied).toBe(1);
  });

  it('replans to fewer minutes and carries missed work to the next day with a note', async () => {
    const plan = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    const short = TodayPlan.parse((await call('POST', '/v1/plan/replan', { minutes: 30 })).json());
    expect(
      short.tasks.filter((t) => t.status === 'todo').reduce((a, t) => a + t.minutes, 0),
    ).toBeLessThanOrEqual(30);
    expect(short.note).toMatch(/moved to tomorrow/);
    expect(plan.tasks.length).toBeGreaterThan(0);

    now = new Date('2026-11-11T07:00:00+05:30'); // skipped a day
    const later = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    expect(later.note).toMatch(/moved to today/);
  });
});
