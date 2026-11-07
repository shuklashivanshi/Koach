import { usersRepo } from '@koach/db';
import {
  getNode,
  GroundedAnswer,
  groundStrategyAnswer,
  listNodes,
  pyqsForNode,
  subjectWeightage,
} from '@koach/kb';
import {
  ApiErrorBody,
  KbNodeDetail,
  KbNodeList,
  KbPyqList,
  KbStats,
  KbStrategyAnswer,
} from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../../deps';

// Read-only knowledge base (KB-01..04). Requires a signed-in user like every /v1 route.
export const kbRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      '/kb/nodes',
      {
        schema: {
          querystring: z.object({ paper: z.string().max(64).optional() }),
          response: { 200: KbNodeList },
        },
      },
      async (request) => ({ nodes: await listNodes(deps.db, request.query.paper) }),
    );

    app.get(
      '/kb/nodes/:id',
      {
        schema: {
          params: z.object({ id: z.string().max(200) }),
          response: { 200: KbNodeDetail, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const view = await getNode(deps.db, request.params.id);
        if (!view) return reply.code(404).send({ error: 'not_found' });
        // The response schema strips internal fields such as the review status.
        return view;
      },
    );

    app.get('/kb/stats', { schema: { response: { 200: KbStats } } }, async () => ({
      subjects: await subjectWeightage(deps.db),
    }));

    app.get(
      '/kb/pyqs',
      {
        schema: {
          querystring: z.object({ node: z.string().max(200) }),
          response: { 200: KbPyqList },
        },
      },
      async (request) => ({ pyqs: await pyqsForNode(deps.db, request.query.node) }),
    );

    // Strategy questions are answered only from stored claims, or declined (KB-05).
    app.get(
      '/kb/strategy',
      {
        schema: {
          querystring: z.object({ q: z.string().min(3).max(300) }),
          response: { 200: KbStrategyAnswer },
        },
      },
      async (request) => {
        // ai_calls references users, so make sure the row exists before usage is persisted.
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        return groundStrategyAnswer(deps.db, request.query.q, async (prompt) => {
          const res = await deps.ai.json({
            feature: 'kb.strategy',
            tier: 'lite',
            prompt,
            schema: GroundedAnswer,
            uid: request.uid,
          });
          return res.data;
        });
      },
    );
  };
