import { aiCallsRepo, type Db } from '@koach/db';
import { type AiUsage, generateJson, generateText, synthesize, type TextTier } from '@koach/ai';
import type { z } from 'zod';

/** What routes need from the AI layer; tests provide a fake. */
export interface AiService {
  text(req: { feature: string; tier: TextTier; prompt: string; uid: string }): Promise<{
    text: string;
    model: string;
    costUsd: number;
  }>;
  speak(req: { feature: string; text: string; uid: string }): Promise<{
    audioBase64: string;
    costUsd: number;
  }>;
  /** Structured output validated against the schema. */
  json<S extends z.ZodType>(req: {
    feature: string;
    tier: TextTier;
    prompt: string;
    schema: S;
    uid: string;
  }): Promise<{ data: z.infer<S>; model: string; costUsd: number }>;
}

/** Vertex + Cloud TTS, persisting every call to ai_calls (D-19). */
export function vertexAi(db: Db): AiService {
  const onCall = async (u: AiUsage) => {
    // Calls without a known user row are still logged to Cloud Logging, just not persisted.
    if (!u.uid) return;
    await aiCallsRepo.insert(db, {
      uid: u.uid,
      feature: u.feature,
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      chars: u.chars,
      estCostUsd: u.costUsd,
      latencyMs: u.latencyMs,
    });
  };
  return {
    text: (req) => generateText(req, { onCall }),
    speak: (req) => synthesize(req, { onCall }),
    json: (req) => generateJson(req, { onCall }),
  };
}
