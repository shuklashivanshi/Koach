import { learnerRepo } from '@koach/db';
import { loadKb, readKb } from '@koach/kb';
import {
  DiagnosticOutcome,
  DiagnosticQuestions,
  ExportBundleSchema,
  ProfileResponse,
  SubjectList,
} from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;

describe('onboarding: profile and diagnostic', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp();
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
  });
  afterEach(() => ctx.close());
  const h = bearer('u1', 'a@b.co');
  const profile = {
    target: 'cse-2027',
    weekdayMinutes: [150, 150, 150, 150, 150, 300, 300],
    workHours: '09:30-18:30',
    quietHours: '23:00-06:30',
    selfAssessment: { polity: 'some', history: 'new', economy: 'strong' },
  };

  it('lists subjects to self-rate and round-trips the profile', async () => {
    const subjects = SubjectList.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/subjects', headers: h })).json(),
    );
    expect(subjects.subjects.map((s) => s.id)).toContain('polity');
    expect(
      ProfileResponse.parse(
        (await ctx.app.inject({ method: 'GET', url: '/v1/profile', headers: h })).json(),
      ).profile,
    ).toBeNull();
    const put = await ctx.app.inject({
      method: 'PUT',
      url: '/v1/profile',
      headers: h,
      payload: profile,
    });
    expect(put.statusCode).toBe(200);
    const got = ProfileResponse.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/profile', headers: h })).json(),
    );
    expect(got.profile).toMatchObject({
      weekdayMinutes: profile.weekdayMinutes,
      onboardedAt: null,
    });
    const levels = await learnerRepo.listLevels(ctx.deps.db, 'u1');
    expect(levels.find((l) => l.sectionId === 'gs3.indian-economy')).toMatchObject({
      level: 0.7,
      source: 'self',
    });
  });

  it('rejects malformed hours', async () => {
    const bad = await ctx.app.inject({
      method: 'PUT',
      url: '/v1/profile',
      headers: h,
      payload: { ...profile, workHours: '9-5' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('serves keyed questions without answers, scores on the server and completes onboarding', async () => {
    await ctx.app.inject({ method: 'PUT', url: '/v1/profile', headers: h, payload: profile });
    const res = await ctx.app.inject({ method: 'GET', url: '/v1/diagnostic', headers: h });
    const q = DiagnosticQuestions.parse(res.json());
    expect(res.body).not.toContain('"answer"');
    // The fixture has two keyed Prelims questions (one per polity section); only 4-option ones qualify.
    expect(q.questions.every((x) => x.options.length === 4)).toBe(true);

    const out = DiagnosticOutcome.parse(
      (
        await ctx.app.inject({
          method: 'POST',
          url: '/v1/diagnostic',
          headers: h,
          payload: {
            answers: [
              { pyqId: 'pre-2023-gs1-q001', chosen: 'a' },
              { pyqId: 'pre-2023-gs1-q002', chosen: 'b' },
            ],
          },
        })
      ).json(),
    );
    expect(out).toMatchObject({ score: 1, total: 2 });
    // Fixture sections are not real subject sections, so levels stay at the self-rating here;
    // the blend itself is covered by blendLevels.
    expect(out.levels.polity).toBe(0.4);
    const me = ProfileResponse.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/profile', headers: h })).json(),
    );
    expect(me.profile?.onboardedAt).not.toBeNull();

    const bundle = ExportBundleSchema.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/me/export', headers: h })).json(),
    );
    expect(bundle.learner.diagnostics).toHaveLength(1);
    expect(bundle.learner.levels.length).toBeGreaterThan(10);
  });

  it('skipping the check uses self-ratings and still completes onboarding', async () => {
    await ctx.app.inject({ method: 'PUT', url: '/v1/profile', headers: h, payload: profile });
    const out = DiagnosticOutcome.parse(
      (
        await ctx.app.inject({
          method: 'POST',
          url: '/v1/diagnostic',
          headers: h,
          payload: { answers: [] },
        })
      ).json(),
    );
    expect(out).toMatchObject({ score: 0, total: 0 });
    expect(out.levels.polity).toBe(0.4);
  });
});
