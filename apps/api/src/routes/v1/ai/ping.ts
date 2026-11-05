import { usersRepo } from '@koach/db';
import { AiPingResponse } from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Deps } from '../../../deps';

const PROMPT = 'Reply with one short encouraging sentence for a UPSC aspirant. No names, no emoji.';

/** Proves the Vertex + TTS path end to end (Phase 1 success criterion 4). */
export const aiPingRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/ai/ping', { schema: { response: { 200: AiPingResponse } } }, async (request) => {
      // ai_calls references users, so make sure the row exists before usage is persisted.
      await usersRepo.upsert(deps.db, request.uid, request.userEmail);
      const reply = await deps.ai.text({
        feature: 'ping',
        tier: 'bulk',
        prompt: PROMPT,
        uid: request.uid,
      });
      const speech = await deps.ai.speak({ feature: 'ping', text: reply.text, uid: request.uid });
      return {
        text: reply.text,
        audioBase64: speech.audioBase64,
        model: reply.model,
        costUsd: Math.round((reply.costUsd + speech.costUsd) * 1e6) / 1e6,
      };
    });
  };
