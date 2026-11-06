// The ONLY place model IDs live (D-16). Everything else asks for a tier.
// Locations are verified by scripts/check-models.ts; results are recorded in MODELS.md.

export type TextTier = 'bulk' | 'lite';
export type Tier = TextTier | 'embed';

export interface ModelChoice {
  model: string;
  location: string;
}

export const tiers: Record<Tier, ModelChoice> = {
  // Not served in asia-south1 (MODELS.md, 2026-11-06). Prompts carry no personal data.
  bulk: { model: 'gemini-3.8-flash', location: 'global' },
  lite: { model: 'gemini-3.5-flash-lite', location: 'asia-south1' },
  // Not served in asia-south1 (MODELS.md, 2026-11-06).
  embed: { model: 'gemini-embedding-2', location: 'global' },
};

export const tts = {
  languageCode: 'en-IN',
  // Best available en-IN Chirp HD voice; confirmed by scripts/check-models.ts.
  voice: 'en-IN-Chirp3-HD-Aoede',
  audioEncoding: 'MP3' as const,
};

/**
 * USD per 1M tokens (text) or per 1M characters (TTS), used for cost logging only.
 * ESTIMATES pending confirmation against cloud.google.com/vertex-ai/generative-ai/pricing
 * (the pricing page could not be read when this file was written, 2026-11-06).
 */
export const pricing: Record<string, { inputPerM: number; outputPerM: number; verified: boolean }> =
  {
    'gemini-3.8-flash': { inputPerM: 0.3, outputPerM: 2.5, verified: false },
    'gemini-3.5-flash-lite': { inputPerM: 0.1, outputPerM: 0.4, verified: false },
    'gemini-embedding-2': { inputPerM: 0.15, outputPerM: 0, verified: false },
  };
export const ttsPricePerMChars = { usd: 30, verified: false };

/** Tier lookup with an env override (AI_MODEL_BULK, AI_MODEL_LITE, AI_MODEL_EMBED) for experiments. */
export function resolveTier(tier: Tier, env: NodeJS.ProcessEnv = process.env): ModelChoice {
  const override = env[`AI_MODEL_${tier.toUpperCase()}`];
  const base = tiers[tier];
  return override ? { ...base, model: override } : base;
}
