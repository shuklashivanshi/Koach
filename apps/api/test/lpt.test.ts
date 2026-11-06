import { forms } from '@koach/lpt';
import { ExportBundleSchema, LptForm, LptProfileResponse, TranscribeResponse } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { bearer, buildTestApp } from './helpers';

const fakeAi = (recalled: number[]): AiService => ({
  text: () => Promise.reject(new Error('unused')),
  speak: (req) =>
    Promise.resolve({ audioBase64: Buffer.from(req.text).toString('base64'), costUsd: 0 }),
  json: () => Promise.resolve({ data: { recalled } as never, model: 'fake', costUsd: 0 }),
  transcribe: () => Promise.resolve({ text: 'monsoon delta', costUsd: 0 }),
});

describe('learning pattern test API', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp({ ai: fakeAi([1, 2, 3, 4, 5, 6]) });
  });
  afterEach(() => ctx.close());
  const h = bearer('u1', 'a@b.co');
  const get = (url: string) => ctx.app.inject({ method: 'GET', url, headers: h });

  const perfect = () => {
    const f = forms.A;
    const pins = Object.fromEntries(f.places.map((p) => [p.name, { lat: p.lat, lon: p.lon }]));
    return {
      form: 'A' as const,
      immediate: {
        mapPins: pins,
        grid: f.grid,
        listen: f.lists.map((l) => l.join(' ')),
        readWrite: 'mangroves protect coasts',
        arrange: f.events.map((e) => e.label),
      },
      delayed: {
        mapPins: pins,
        listen: f.lists[1]!.join(' '),
        readWrite: 'mangroves',
        arrange: f.events.map((e) => e.label),
      },
      hiddenMs: 0,
      skipped: [],
    };
  };

  it('serves a form without the recall lists as text, and the lists as audio', async () => {
    const res = await get('/v1/lpt/form');
    const form = LptForm.parse(res.json());
    expect(form.form).toBe('A');
    expect(res.body).not.toContain('estuary');
    const audio = (await get('/v1/lpt/audio/A/0')).json<{ audioBase64: string }>();
    expect(Buffer.from(audio.audioBase64, 'base64').toString()).toContain('estuary');
  });

  it('scores on the server, stores a profile with one line, then alternates forms', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/lpt/results',
      headers: h,
      payload: perfect(),
    });
    const { profile } = LptProfileResponse.parse(res.json());
    // Read & Write Back: 6 of 9 idea units both times → 67
    expect(profile?.scores).toEqual({
      visual: 100,
      auditory: 100,
      readwrite: 67,
      kinesthetic: 100,
    });
    expect(profile?.line).toMatch(/stick|sticks/);
    expect(profile?.lowConfidence).toBe(false);
    expect(LptForm.parse((await get('/v1/lpt/form')).json()).form).toBe('B');
    const bundle = ExportBundleSchema.parse((await get('/v1/me/export')).json());
    expect(bundle.learner.learningPatterns).toHaveLength(1);
  });

  it('flags low confidence and applies recall evidence', async () => {
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/lpt/results',
      headers: h,
      payload: { ...perfect(), hiddenMs: 60_000 },
    });
    const before = LptProfileResponse.parse((await get('/v1/lpt/profile')).json()).profile!;
    expect(before.lowConfidence).toBe(true);
    const after = LptProfileResponse.parse(
      (
        await ctx.app.inject({
          method: 'POST',
          url: '/v1/lpt/evidence',
          headers: h,
          payload: { pattern: 'readwrite', success: 0 },
        })
      ).json(),
    ).profile!;
    expect(after.scores.readwrite).toBeLessThan(before.scores.readwrite);
  });

  it('transcribes spoken answers', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/speech/transcribe',
      headers: h,
      payload: { audioBase64: 'QUJD', seconds: 3 },
    });
    expect(TranscribeResponse.parse(res.json()).text).toBe('monsoon delta');
  });
});
