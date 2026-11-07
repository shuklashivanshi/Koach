import { loadKb, readKb } from '@koach/kb';
import { LearnOutcome, LearnSession, TodayPlan } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;
const UNIT = 'opt.sociology.p1.t01';
const UNIT_TITLE = 'Sociology as a discipline';

describe('chosen optional in the plan', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  let clock = new Date('2026-12-05T08:00:00+05:30');
  const prompts: string[] = [];
  const ai: AiService = {
    text: () => Promise.reject(new Error('unused')),
    speak: () => Promise.reject(new Error('unused')),
    transcribe: () => Promise.reject(new Error('unused')),
    json: (req: { feature: string; prompt: string }) => {
      prompts.push(req.prompt);
      return Promise.resolve({
        data: (req.feature === 'learn.recall.generate'
          ? { items: [1, 2, 3, 4, 5].map((i) => ({ q: `Q${i}?`, a: `A${i}` })) }
          : { ok: [true, true, true, false, true] }) as never,
        model: 'fake',
        costUsd: 0,
      });
    },
  };
  const h = bearer('u1', 'a@b.co');
  const call = (method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) =>
    ctx.app.inject({ method, url, headers: h, ...(payload ? { payload } : {}) });

  beforeEach(async () => {
    clock = new Date('2026-12-05T08:00:00+05:30');
    prompts.length = 0;
    ctx = await buildTestApp({ ai, now: () => clock });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    await call('PUT', '/v1/profile', {
      weekdayMinutes: [600, 600, 600, 600, 600, 600, 600],
      workHours: null,
      quietHours: null,
      selfAssessment: {},
    });
    await call('POST', '/v1/diagnostic', { answers: [] });
  });
  afterEach(() => ctx.close());

  const choose = () =>
    call('POST', '/v1/optionals/choice', { slug: 'sociology', reasons: 'Overlap with GS.' });

  it('plans the first unit, opens it as a Learn session, and titles its review', async () => {
    expect((await choose()).statusCode).toBe(200);
    const plan = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    const task = plan.tasks.find((t) => t.kind === 'learn' && t.nodeId === UNIT);
    expect(task).toBeDefined();

    const res = await call('GET', `/v1/learn/${UNIT}`);
    expect(res.statusCode).toBe(200);
    const session = LearnSession.parse(res.json());
    expect(session.pyqs).toEqual([]);
    expect(session.source).toBeNull();
    expect(session.goal).toMatch(/^Cover /);
    expect(session.node.estMinutes).toBe(90);
    expect(session.recall.length).toBeGreaterThan(0);
    // The prompt names the optional so the questions suit the subject.
    expect(prompts[0]).toContain('Optional subject: Sociology');

    // Sections and papers of an optional, and GS topics, are not sessions.
    expect((await call('GET', '/v1/learn/opt.sociology.p1')).statusCode).toBe(404);
    expect((await call('GET', '/v1/learn/opt.sociology')).statusCode).toBe(404);

    LearnOutcome.parse(
      (
        await call('POST', `/v1/learn/${UNIT}`, {
          recall: session.recall.map((r, i) => ({ ...r, got: i > 0 })),
          answers: [],
          taskId: task!.id,
        })
      ).json(),
    );

    clock = new Date('2026-12-06T08:00:00+05:30');
    const next = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    const revise = next.tasks.find((t) => t.kind === 'revise' && t.nodeId === UNIT);
    expect(revise?.title).toBe(`Revise: ${UNIT_TITLE}`);
    expect(next.tasks.some((t) => t.title === `Revise: ${UNIT}`)).toBe(false);
  });
});
