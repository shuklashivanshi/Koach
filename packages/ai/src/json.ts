import { z } from 'zod';
import { type GenAiPart, vertexClient } from './client';
import { textCostUsd } from './cost';
import { resolveTier, type TextTier } from './models.config';
import { withRetry } from './retry';
import type { TextOptions } from './text';
import { logUsage } from './usage';

export interface JsonResult<T> {
  data: T;
  model: string;
  costUsd: number;
}

/**
 * Structured output: Gemini answers in JSON constrained by the zod schema, and the result is
 * validated. One retry on malformed or invalid JSON. Optional files (e.g. PDFs) are sent inline.
 */
export async function generateJson<S extends z.ZodType>(
  req: {
    feature: string;
    tier: TextTier;
    prompt: string;
    schema: S;
    files?: { mimeType: string; base64: string }[];
    uid?: string | null;
    maxOutputTokens?: number;
  },
  opts: TextOptions = {},
): Promise<JsonResult<z.infer<S>>> {
  const { model, location } = resolveTier(req.tier);
  const client = (opts.client ?? vertexClient)(location);
  const parts: GenAiPart[] = [
    ...(req.files ?? []).map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.base64 } })),
    { text: req.prompt },
  ];
  const jsonSchema = z.toJSONSchema(req.schema, { target: 'openapi-3.0' });
  let totalCost = 0;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    const res = await withRetry(
      () =>
        client.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: jsonSchema,
            temperature: 0.2,
            ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
          },
        }),
      { ...(opts.sleep ? { sleep: opts.sleep } : {}) },
    );
    const inputTokens = res.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
    const costUsd = textCostUsd(model, inputTokens, outputTokens);
    totalCost += costUsd;
    const usage = {
      feature: req.feature,
      uid: req.uid ?? null,
      model,
      inputTokens,
      outputTokens,
      chars: 0,
      costUsd,
      latencyMs: Date.now() - started,
    };
    logUsage(usage);
    await opts.onCall?.(usage);
    try {
      const data = req.schema.parse(JSON.parse(res.text ?? ''));
      return { data, model, costUsd: totalCost };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`generateJson(${req.feature}): invalid output after retry`, { cause: lastError });
}
