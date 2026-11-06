import { loadKb, readKb } from '@koach/kb';
import { NotificationSettingsResponse } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { recordingPush } from '../src/services/push';
import { inRange, ReminderTypes, reminderCopy } from '../src/services/reminders';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;

describe('reminder rules', () => {
  it('keeps every copy within limits and handles ranges across midnight', () => {
    for (const t of ReminderTypes)
      for (const tone of ['calm', 'firm', 'cheerful'] as const) {
        expect(() => reminderCopy(t, tone, 12)).not.toThrow();
      }
    expect(inRange('23:00-06:30', '02:00')).toBe(true);
    expect(inRange('23:00-06:30', '07:00')).toBe(false);
    expect(inRange('09:30-18:30', '12:00')).toBe(true);
  });
});

describe('reminders end to end', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  const push = recordingPush();
  let now = new Date('2026-11-09T07:05:00+05:30');
  const h = bearer('u1', 'a@b.co');
  beforeEach(async () => {
    push.sent.length = 0;
    now = new Date('2026-11-09T07:05:00+05:30');
    ctx = await buildTestApp({
      push,
      now: () => now,
      config: loadConfig({ APP_ENV: 'dev', CRON_SECRET: 's3cret', VAPID_PUBLIC_KEY: 'pub' }),
    });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    await ctx.app.inject({
      method: 'PUT',
      url: '/v1/profile',
      headers: h,
      payload: {
        weekdayMinutes: [150, 150, 150, 150, 150, 300, 300],
        workHours: '09:30-18:30',
        quietHours: '23:00-06:30',
        selfAssessment: {},
      },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/diagnostic',
      headers: h,
      payload: { answers: [] },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/push/subscribe',
      headers: h,
      payload: { endpoint: 'https://push.example/abc', keys: { p256dh: 'k', auth: 'a' } },
    });
  });
  afterEach(() => ctx.close());
  const run = (secret = 's3cret') =>
    ctx.app.inject({
      method: 'POST',
      url: '/internal/reminders',
      headers: { 'x-cron-secret': secret },
    });

  it('requires the scheduler secret', async () => {
    expect((await run('nope')).statusCode).toBe(403);
  });

  it('sends the plan-ready push once in its window and never in work hours', async () => {
    expect((await run()).json()).toEqual({ sent: 1 });
    expect(push.sent[0]?.message.title).toBe('Your plan is ready');
    expect((await run()).json()).toEqual({ sent: 0 }); // once per day
    now = new Date('2026-11-09T19:02:00+05:30'); // due reviews time, but nothing is due yet
    expect((await run()).json()).toEqual({ sent: 0 });
  });

  it('respects settings and tone', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: '/v1/notifications',
      headers: h,
      payload: {
        prefs: {
          plan_ready: { on: true, time: '12:00' },
          due_reviews: { on: true, time: '19:00' },
          ca_quiz: { on: false, time: '08:30' },
          streak: { on: true, time: '21:00' },
        },
        tone: 'firm',
      },
    });
    expect(NotificationSettingsResponse.parse(res.json()).publicKey).toBe('pub');
    now = new Date('2026-11-09T12:05:00+05:30'); // inside work hours: suppressed
    expect((await run()).json()).toEqual({ sent: 0 });
    now = new Date('2026-11-09T21:03:00+05:30'); // nothing done today → streak, firm tone
    expect((await run()).json()).toEqual({ sent: 1 });
    expect(push.sent.at(-1)?.message.title).toBe('Streak at risk');
  });
});
