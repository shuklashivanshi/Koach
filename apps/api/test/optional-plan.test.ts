import { loadKb, readKb } from '@koach/kb';
import {
  LearnOutcome,
  LearnSession,
  OptionalChoiceResult,
  OptionalOutline,
  TodayPlan,
} from '@koach/shared';
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

  const outline = async () =>
    OptionalOutline.parse((await call('GET', '/v1/optionals/outline')).json());

  it('has no outline before a choice', async () => {
    expect((await call('GET', '/v1/optionals/outline')).statusCode).toBe(404);
  });

  it('outlines the chosen optional in order with planned versus first-pass hours', async () => {
    await choose();
    const o = await outline();
    expect(o).toMatchObject({
      slug: 'sociology',
      name: 'Sociology',
      firstPassHours: 350,
      plannedHours: 3,
      studied: 0,
      paused: false,
    });
    expect(o.units.map((u) => [u.nodeId, u.paper, u.minutes, u.status, u.scheduledOn])).toEqual([
      [UNIT, 'I', 90, 'todo', null],
      ['opt.sociology.p1.t02', 'I', 90, 'todo', null],
    ]);

    // Once today's plan exists, the first unit shows the day it is planned for.
    const plan = TodayPlan.parse((await call('GET', '/v1/plan/today')).json());
    expect((await outline()).units[0]?.scheduledOn).toBe('2026-12-05');

    const task = plan.tasks.find((t) => t.nodeId === UNIT)!;
    await call('POST', `/v1/learn/${UNIT}`, { recall: [], answers: [], taskId: task.id });
    const after = await outline();
    expect(after.studied).toBe(1);
    expect(after.units[0]).toMatchObject({ status: 'studied', scheduledOn: null });
    expect(after.units[1]?.status).toBe('todo');
  });

  it('reports the optional as paused once the Prelims phase starts', async () => {
    await choose();
    clock = new Date('2027-02-10T08:00:00+05:30');
    expect((await outline()).paused).toBe(true);
  });

  it('says when the optional joins the plan, and is idempotent', async () => {
    const first = OptionalChoiceResult.parse((await choose()).json());
    expect(first).toMatchObject({
      chosen: 'sociology',
      startsOn: '2026-12-05',
      pausedForPrelims: false,
    });
    expect(OptionalChoiceResult.parse((await choose()).json())).toEqual(first);

    // Today's plan is built and stable, so the optional joins tomorrow.
    await call('GET', '/v1/plan/today');
    expect(OptionalChoiceResult.parse((await choose()).json()).startsOn).toBe('2026-12-06');
  });

  it('pauses the choice result for a start day in the Prelims-intensive phase', async () => {
    clock = new Date('2027-01-31T08:00:00+05:30');
    await call('GET', '/v1/plan/today');
    const r = OptionalChoiceResult.parse((await choose()).json());
    expect(r).toMatchObject({ startsOn: '2027-02-01', pausedForPrelims: true });
  });

  it('keeps the choice, reasons and quiz answers in the account export', async () => {
    await call('POST', '/v1/optionals/quiz', {
      background: 'engineering',
      interests: ['society'],
      reading: ['debates'],
      answerStyle: ['analytical'],
      hours: 400,
      languages: [],
      risk: 0.3,
    });
    await choose();
    const res = await call('GET', '/v1/me/export');
    expect(res.statusCode).toBe(200);
    const profile = res.json().learner.profile;
    expect(profile.optional).toBe('sociology');
    expect(profile.optionalReasons).toBe('Overlap with GS.');
    expect(profile.optionalQuiz).toMatchObject({ background: 'engineering', hours: 400 });
  });
});
