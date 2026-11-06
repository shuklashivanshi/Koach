import { describe, expect, it, vi } from 'vitest';
import type { GenAiLike } from './client';
import { textCostUsd } from './cost';
import { generateText } from './text';
import type { AiUsage } from './usage';

function fakeClient(responses: (Error | { text: string; inTok: number; outTok: number })[]) {
  const calls: Parameters<GenAiLike['models']['generateContent']>[0][] = [];
  const client: GenAiLike = {
    models: {
      generateContent(req) {
        calls.push(req);
        const next = responses.shift();
        if (!next) throw new Error('no more responses');
        if (next instanceof Error) return Promise.reject(next);
        return Promise.resolve({
          text: next.text,
          usageMetadata: { promptTokenCount: next.inTok, candidatesTokenCount: next.outTok },
        });
      },
    },
  };
  return { client, calls };
}

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('generateText', () => {
  it('uses the tier model and reports usage and cost', async () => {
    const { client, calls } = fakeClient([{ text: ' Keep going. ', inTok: 1000, outTok: 200 }]);
    const usages: AiUsage[] = [];
    const res = await generateText(
      { feature: 'ping', tier: 'bulk', prompt: 'hi', uid: 'u1' },
      { client: () => client, onCall: (u) => void usages.push(u) },
    );
    expect(calls[0]?.model).toBe('gemini-3.8-flash');
    expect(res.text).toBe('Keep going.');
    expect(res.costUsd).toBe(textCostUsd('gemini-3.8-flash', 1000, 200));
    expect(usages).toEqual([
      expect.objectContaining({ feature: 'ping', uid: 'u1', inputTokens: 1000, outputTokens: 200 }),
    ]);
  });

  it('retries a 429 and then succeeds', async () => {
    const { client, calls } = fakeClient([httpError(429), { text: 'ok', inTok: 1, outTok: 1 }]);
    const sleep = vi.fn(() => Promise.resolve());
    const res = await generateText(
      { feature: 'f', tier: 'lite', prompt: 'p' },
      { client: () => client, sleep },
    );
    expect(res.text).toBe('ok');
    expect(calls).toHaveLength(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('gives up after 3 attempts and does not retry client errors', async () => {
    const sleep = () => Promise.resolve();
    const many = fakeClient([httpError(503), httpError(503), httpError(503), httpError(503)]);
    await expect(
      generateText(
        { feature: 'f', tier: 'bulk', prompt: 'p' },
        { client: () => many.client, sleep },
      ),
    ).rejects.toThrow('503');
    expect(many.calls).toHaveLength(3);

    const bad = fakeClient([httpError(400)]);
    await expect(
      generateText(
        { feature: 'f', tier: 'bulk', prompt: 'p' },
        { client: () => bad.client, sleep },
      ),
    ).rejects.toThrow('400');
    expect(bad.calls).toHaveLength(1);
  });
});

describe('cost', () => {
  it('computes USD from per-million prices', () => {
    expect(textCostUsd('gemini-3.8-flash', 1_000_000, 0)).toBe(0.3);
    expect(textCostUsd('unknown-model', 100, 100)).toBe(0);
  });
});
