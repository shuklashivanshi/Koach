import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { GenAiLike } from './client';
import { generateJson } from './json';

function fake(texts: string[]) {
  const calls: Parameters<GenAiLike['models']['generateContent']>[0][] = [];
  const client: GenAiLike = {
    models: {
      generateContent(req) {
        calls.push(req);
        return Promise.resolve({ text: texts.shift() ?? '', usageMetadata: {} });
      },
    },
  };
  return { client, calls };
}

const Schema = z.object({ items: z.array(z.object({ id: z.string() })) });

describe('generateJson', () => {
  it('asks for JSON with the schema, sends files and validates the result', async () => {
    const { client, calls } = fake(['{"items":[{"id":"a"}]}']);
    const res = await generateJson(
      {
        feature: 't',
        tier: 'bulk',
        prompt: 'list',
        schema: Schema,
        files: [{ mimeType: 'application/pdf', base64: 'UERG' }],
      },
      { client: () => client },
    );
    expect(res.data.items[0]?.id).toBe('a');
    const req = calls[0]!;
    expect(req.config?.responseMimeType).toBe('application/json');
    expect(req.config?.responseJsonSchema).toBeTruthy();
    expect(JSON.stringify(req.contents)).toContain('application/pdf');
  });

  it('retries once on invalid output, then fails', async () => {
    const ok = fake(['not json', '{"items":[]}']);
    await expect(
      generateJson(
        { feature: 't', tier: 'bulk', prompt: 'x', schema: Schema },
        { client: () => ok.client },
      ),
    ).resolves.toMatchObject({ data: { items: [] } });
    const bad = fake(['{"items":3}', 'nope']);
    await expect(
      generateJson(
        { feature: 't', tier: 'bulk', prompt: 'x', schema: Schema },
        { client: () => bad.client },
      ),
    ).rejects.toThrow('invalid output after retry');
  });
});
