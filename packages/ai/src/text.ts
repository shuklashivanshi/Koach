import { type GenAiLike, vertexClient } from './client';
import { textCostUsd } from './cost';
import { resolveTier, type TextTier } from './models.config';
import { withRetry } from './retry';
import { logUsage, type OnCall } from './usage';

export interface TextResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

export interface TextOptions {
  client?: (location: string) => GenAiLike;
  onCall?: OnCall;
  sleep?: (ms: number) => Promise<void>;
}

/** Generates text with the model for a tier, logging and persisting usage. No PII in prompts. */
export async function generateText(
  req: { feature: string; tier: TextTier; prompt: string; uid?: string | null },
  opts: TextOptions = {},
): Promise<TextResult> {
  const { model, location } = resolveTier(req.tier);
  const client = (opts.client ?? vertexClient)(location);
  const started = Date.now();
  const res = await withRetry(
    () => client.models.generateContent({ model, contents: req.prompt }),
    {
      ...(opts.sleep ? { sleep: opts.sleep } : {}),
    },
  );
  const inputTokens = res.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
  const result: TextResult = {
    text: (res.text ?? '').trim(),
    model,
    inputTokens,
    outputTokens,
    costUsd: textCostUsd(model, inputTokens, outputTokens),
    latencyMs: Date.now() - started,
  };
  const usage = {
    feature: req.feature,
    uid: req.uid ?? null,
    model,
    inputTokens,
    outputTokens,
    chars: 0,
    costUsd: result.costUsd,
    latencyMs: result.latencyMs,
  };
  logUsage(usage);
  await opts.onCall?.(usage);
  return result;
}
