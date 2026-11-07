import { checkText } from '@koach/guard';
import { loadKb, readKb } from '@koach/kb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { dispatchNudges, nudgeCandidates, TEMPLATES } from '../src/services/coach';
import { recordingPush } from '../src/services/push';
import type { Tone } from '../src/services/reminders';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;
const at = (day: string) => new Date(`${day}T08:00:00+05:30`);

describe('decision nudge', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  const h = bearer('u1', 'a@b.co');
  const call = (method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) =>
    ctx.app.inject({ method, url, headers: h, ...(payload ? { payload } : {}) });
  const decision = async (day: string) =>
    (await nudgeCandidates(ctx.deps.db, 'u1', at(day))).filter((c) => c.kind === 'decision');

  beforeEach(async () => {
    ctx = await buildTestApp({ now: () => at('2026-12-01') });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    // Creates the learner row with the default decision deadline, 2026-12-15.
    await call('PUT', '/v1/profile', {
      weekdayMinutes: [150, 150, 150, 150, 150, 300, 300],
      workHours: null,
      quietHours: null,
      selfAssessment: {},
    });
  });
  afterEach(() => ctx.close());

  it('starts 14 days out, includes the deadline day and keeps going afterwards', async () => {
    expect(await decision('2026-11-20')).toEqual([]);
    expect(await decision('2026-12-01')).toEqual([{ kind: 'decision', subject: '14' }]);
    expect(await decision('2026-12-15')).toEqual([{ kind: 'decision', subject: '0' }]);
    expect(await decision('2026-12-20')).toEqual([{ kind: 'decision', subject: '-5' }]);
  });

  it('stops once an optional is chosen', async () => {
    expect(
      (
        await call('POST', '/v1/optionals/choice', {
          slug: 'sociology',
          reasons: 'Overlap with GS and I enjoy it.',
        })
      ).statusCode,
    ).toBe(200);
    for (const day of ['2026-12-01', '2026-12-15', '2026-12-20']) {
      expect(await decision(day)).toEqual([]);
    }
  });

  it('keeps every decision template within the notification limits and the naming guard', () => {
    const tones: Tone[] = ['calm', 'firm', 'cheerful'];
    for (const tone of tones) {
      for (const subject of ['14', '3', '1', '0', '-1', '-5', '-100']) {
        const { title, body } = TEMPLATES.decision[tone](subject);
        expect(title.length).toBeLessThanOrEqual(30);
        expect(body.length).toBeLessThanOrEqual(60);
        expect(checkText(`${title} ${body}`)).toEqual([]);
        expect(`${title} ${body}`).not.toMatch(/[!]/);
      }
    }
  });

  it('says the date has passed for an overdue subject, never a negative count', () => {
    const tones: Tone[] = ['calm', 'firm', 'cheerful'];
    for (const tone of tones) {
      const { body } = TEMPLATES.decision[tone]('-5');
      expect(body).toMatch(/passed 5 days ago/);
      expect(body).not.toMatch(/-5|left|to decide|to go/);
      expect(TEMPLATES.decision[tone]('-1').body).toMatch(/passed 1 day ago/);
      // On the day and before it the copy is unchanged in spirit: no "0 days".
      expect(TEMPLATES.decision[tone]('0').body).not.toMatch(/0 days/);
      expect(TEMPLATES.decision[tone]('3').body).toMatch(/3 days/);
    }
  });

  describe('AI-written copy', () => {
    const run = async (day: string, aiTitle: string) => {
      const prompts: string[] = [];
      const ai: AiService = {
        text: () => Promise.reject(new Error('unused')),
        speak: () => Promise.reject(new Error('unused')),
        transcribe: () => Promise.reject(new Error('unused')),
        json: (req: { prompt: string }) => {
          prompts.push(req.prompt);
          return Promise.resolve({
            data: { title: aiTitle, body: 'Pick one this week.' } as never,
            model: 'f',
            costUsd: 0,
          });
        },
      };
      const push = recordingPush();
      const target = { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } };
      const sent = await dispatchNudges(
        ctx.deps.db,
        push,
        ai,
        at(day),
        'u1',
        { workHours: null, quietHours: null },
        'calm',
        '09:00',
        [target],
      );
      return { prompts, push, sent };
    };

    it('describes an overdue decision to the model when the subject is negative', async () => {
      const { prompts, sent } = await run('2026-12-20', 'Time to choose');
      expect(sent).toBe(1);
      expect(prompts[0]).toMatch(/passed 5 days ago and they have not chosen/);
      expect(prompts[0]).not.toMatch(/within -5 days/);
    });

    it('falls back to the template when the AI copy is over the limits', async () => {
      const { push } = await run('2026-12-20', 'A title that is far longer than thirty characters');
      expect(push.sent[0]?.message.body).toMatch(/passed 5 days ago/);
    });
  });
});
