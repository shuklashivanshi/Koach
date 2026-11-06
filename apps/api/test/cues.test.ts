import { loadKb, readKb } from '@koach/kb';
import { forms } from '@koach/lpt';
import {
  CoachState,
  CueResponse,
  DueCards,
  LptProfileResponse,
  RecallGrade,
  TodayPlan,
} from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;
const FACTS = [
  'Article 14 guarantees equality before law.',
  'Article 15 bars discrimination.',
  'Article 16 covers public jobs.',
  'Article 17 abolishes untouchability.',
  'Article 18 abolishes titles.',
];

/** Fake AI: answers by feature; `decodeOk` controls whether the mnemonic decodes back. */
function fakeAi(decodeOk = true): AiService & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    text: () => Promise.reject(new Error('unused')),
    speak: (req) =>
      Promise.resolve({ audioBase64: Buffer.from(req.text).toString('base64'), costUsd: 0 }),
    transcribe: () => Promise.reject(new Error('unused')),
    json: (req: { feature: string }) => {
      calls.push(req.feature);
      const f = req.feature;
      const data =
        f === 'cue.facts'
          ? { facts: FACTS }
          : f === 'cue.facts.verify'
            ? { ok: FACTS.map(() => true) }
            : f === 'cue.mnemonic'
              ? {
                  kind: 'acronym',
                  device: 'E-D-P-U-T',
                  mapping: FACTS.map((x, i) => ({ key: 'EDPUT'[i]!, fact: x })),
                }
              : f === 'cue.decode'
                ? { facts: FACTS }
                : f === 'cue.decode.judge'
                  ? { ok: FACTS.map(() => decodeOk) }
                  : f === 'cue.cloze'
                    ? { items: [{ text: 'Article ____ abolishes untouchability.', answer: '17' }] }
                    : f === 'cue.blurt'
                      ? { prompt: 'Write everything you remember.' }
                      : f === 'cue.grade.blurt'
                        ? {
                            covered: [true, true, false, false, false],
                            feedback: 'Add Article 17.',
                          }
                        : f === 'cue.palace'
                          ? {
                              placements: FACTS.map((x, i) => ({
                                locus: `spot ${i}`,
                                fact: x,
                                image: 'a judge on a sofa',
                              })),
                            }
                          : f === 'lpt.readwrite'
                            ? { recalled: [1, 2, 3] }
                            : f === 'coach.note'
                              ? {
                                  kept: 'You finished most Learn tasks.',
                                  slipped: 'Revision slipped on Thursday.',
                                  change: 'Revise first thing each day.',
                                }
                              : {};
      return Promise.resolve({ data: data as never, model: 'fake', costUsd: 0 });
    },
  };
}

describe('memory cues', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  let ai: ReturnType<typeof fakeAi>;
  const now = new Date('2026-11-08T10:00:00+05:30'); // a Sunday
  const h = bearer('u1', 'a@b.co');
  const call = (method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) =>
    ctx.app.inject({ method, url, headers: h, ...(payload ? { payload } : {}) });
  beforeEach(async () => {
    ai = fakeAi();
    ctx = await buildTestApp({ ai, now: () => now });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
  });
  afterEach(() => ctx.close());

  it('defaults to a format and caches the facts and the cue', async () => {
    const first = CueResponse.parse(
      (await call('GET', '/v1/cues/gs2.polity.fr.equality?format=cloze')).json(),
    );
    expect(first.status).toBe('ready');
    expect(first.groups.map((g) => g.pattern)).toEqual([
      'visual',
      'auditory',
      'readwrite',
      'kinesthetic',
      'everyone',
    ]);
    await call('GET', '/v1/cues/gs2.polity.fr.equality?format=cloze');
    expect(ai.calls.filter((c) => c === 'cue.facts')).toHaveLength(1);
    expect(ai.calls.filter((c) => c === 'cue.cloze')).toHaveLength(1);
    const added = (await call('POST', `/v1/cues/item/${first.cue!.id}/cards`)).json<{
      added: number;
    }>();
    expect(added.added).toBe(1);
    expect(DueCards.parse((await call('GET', '/v1/reviews/due')).json()).cards[0]?.front).toContain(
      '____',
    );
  });

  it('shows a mnemonic only when it decodes back to every fact', async () => {
    const ok = CueResponse.parse(
      (await call('GET', '/v1/cues/gs2.polity.fr.equality?format=mnemonic')).json(),
    );
    expect(ok.status).toBe('ready');
    await ctx.close();
    ai = fakeAi(false);
    ctx = await buildTestApp({ ai, now: () => now });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    const bad = CueResponse.parse(
      (await call('GET', '/v1/cues/gs2.polity.fr.equality?format=mnemonic')).json(),
    );
    expect(bad.status).toBe('failed');
    expect(ai.calls.filter((c) => c === 'cue.mnemonic')).toHaveLength(2); // one retry
  });

  it('asks for a memory palace before palace cues, then places facts in its spots', async () => {
    expect(
      CueResponse.parse((await call('GET', '/v1/cues/gs2.polity.fr.equality?format=palace')).json())
        .status,
    ).toBe('palace');
    await call('PUT', '/v1/palace', {
      rooms: [{ name: 'Home', loci: ['door', 'sofa', 'table', 'window', 'bed', 'desk'] }],
    });
    const r = CueResponse.parse(
      (await call('GET', '/v1/cues/gs2.polity.fr.equality?format=palace')).json(),
    );
    expect(r.status).toBe('ready');
  });

  it('grades blurting and feeds it into the reading/writing score; ratings move the profile', async () => {
    const f = forms.A;
    const pins = Object.fromEntries(f.places.map((p) => [p.name, { lat: p.lat, lon: p.lon }]));
    await call('POST', '/v1/lpt/results', {
      form: 'A',
      immediate: {
        mapPins: pins,
        grid: f.grid,
        listen: f.lists.map((l) => l.join(' ')),
        readWrite: 'x',
        arrange: f.events.map((e) => e.label),
      },
      delayed: { mapPins: pins, listen: '', readWrite: 'x', arrange: f.events.map((e) => e.label) },
      hiddenMs: 0,
      skipped: [],
    });
    const before = LptProfileResponse.parse((await call('GET', '/v1/lpt/profile')).json()).profile!
      .scores.readwrite;
    const blurt = CueResponse.parse(
      (await call('GET', '/v1/cues/gs2.polity.fr.equality?format=blurt')).json(),
    );
    const grade = RecallGrade.parse(
      (
        await call('POST', `/v1/cues/item/${blurt.cue!.id}/grade`, {
          text: 'equality, discrimination',
        })
      ).json(),
    );
    expect(grade).toMatchObject({ score: 0.4, feedback: 'Add Article 17.' });
    expect(grade.missed).toHaveLength(3);
    const after = LptProfileResponse.parse((await call('GET', '/v1/lpt/profile')).json()).profile!
      .scores.readwrite;
    expect(after).not.toBe(before);
  });
});

describe('coaching', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  const now = new Date('2026-11-08T19:00:00+05:30'); // Sunday evening
  const h = bearer('u1', 'a@b.co');
  beforeEach(async () => {
    ctx = await buildTestApp({ ai: fakeAi(), now: () => now });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    await ctx.app.inject({
      method: 'PUT',
      url: '/v1/profile',
      headers: h,
      payload: {
        weekdayMinutes: [100, 100, 100, 100, 100, 200, 200],
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
  });
  afterEach(() => ctx.close());

  it('writes a 3-line Sunday note and asks for a check-in; heavy lightens the plan', async () => {
    await ctx.app.inject({ method: 'POST', url: '/v1/coach/note', headers: h });
    const state = CoachState.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/coach', headers: h })).json(),
    );
    expect(state.note?.lines).toEqual([
      'Kept: You finished most Learn tasks.',
      'Slipped: Revision slipped on Thursday.',
      'One change: Revise first thing each day.',
    ]);
    expect(state.checkInDue).toBe(true);
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/coach/checkin',
      headers: h,
      payload: { level: 'heavy' },
    });
    const after = CoachState.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/coach', headers: h })).json(),
    );
    expect(after).toMatchObject({ checkInDue: false, lighterWeek: true });
    const plan = TodayPlan.parse(
      (await ctx.app.inject({ method: 'GET', url: '/v1/plan/today', headers: h })).json(),
    );
    expect(plan.minutes).toBe(160); // Sunday 200 × 0.8
  });
});
