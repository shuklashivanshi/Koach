import { aiCallsRepo, type Db } from '@koach/db';
import { AiPingResponse } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiService } from '../src/services/ai';
import { bearer, buildTestApp } from './helpers';

/** An AiService that persists usage the way vertexAi does, without calling Google. */
function recordingAi(db: () => Db): AiService {
  return {
    async text(req) {
      await aiCallsRepo.insert(db(), {
        uid: req.uid,
        feature: req.feature,
        model: 'm',
        inputTokens: 5,
      });
      return { text: 'Keep going.', model: 'm', costUsd: 0.0001 };
    },
    async speak(req) {
      await aiCallsRepo.insert(db(), {
        uid: req.uid,
        feature: req.feature,
        model: 'voice',
        chars: 11,
      });
      return { audioBase64: 'QUJD', costUsd: 0.0002 };
    },
  };
}

describe('GET /v1/ai/ping', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    const holder: { db?: Db } = {};
    ctx = await buildTestApp({ ai: recordingAi(() => holder.db!) });
    holder.db = ctx.deps.db;
  });
  afterEach(() => ctx.close());

  it('requires auth', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/ai/ping' })).statusCode).toBe(401);
  });

  it('returns text + audio and persists both calls for the user', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/v1/ai/ping', headers: bearer('u1') });
    expect(res.statusCode).toBe(200);
    const body = AiPingResponse.parse(res.json());
    expect(body).toEqual({ text: 'Keep going.', audioBase64: 'QUJD', model: 'm', costUsd: 0.0003 });
    const calls = await aiCallsRepo.listByUid(ctx.deps.db, 'u1');
    expect(calls.map((c) => c.model).sort()).toEqual(['m', 'voice']);
  });
});
