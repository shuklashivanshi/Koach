import {
  ReviewError,
  reviewPyq,
  reviewSample,
  reviewSource,
  reviewSummary,
  sourceCatalogue,
} from '@koach/kb';
import {
  ApiErrorBody,
  ReviewPyqDecision,
  ReviewSample,
  ReviewSourceDecision,
  ReviewSummary,
  SourceCatalogue,
} from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../../deps';

// Admin review of AI-suggested tags and source mappings (KB-07). Signed in AND on ADMIN_EMAILS.
export const adminReviewRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      const email = request.userEmail?.toLowerCase();
      if (!email || !deps.config.ADMIN_EMAILS.includes(email)) {
        await reply.code(403).send({ error: 'forbidden' });
      }
    });

    const reviewer = (email: string | null) => email ?? 'unknown';
    const fail = (
      err: unknown,
    ): { status: 400 | 404; body: { error: 'not_found' | 'unknown_node' | 'unknown_source' } } => {
      if (err instanceof ReviewError) {
        const code = err.message as 'not_found' | 'unknown_node' | 'unknown_source';
        return { status: code === 'not_found' ? 404 : 400, body: { error: code } };
      }
      throw err;
    };

    app.get(
      '/admin/review/sample',
      {
        schema: {
          querystring: z.object({
            type: z.enum(['pyq', 'source']),
            n: z.coerce.number().int().min(1).max(50).default(10),
          }),
          response: { 200: ReviewSample, 403: ApiErrorBody },
        },
      },
      async (request) => ({
        items: await reviewSample(deps.db, request.query.type, request.query.n),
      }),
    );

    app.post(
      '/admin/review/pyq/:id',
      {
        schema: {
          params: z.object({ id: z.string().max(100) }),
          body: ReviewPyqDecision,
          response: { 204: z.null(), 400: ApiErrorBody, 403: ApiErrorBody, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        try {
          await reviewPyq(deps.db, reviewer(request.userEmail), request.params.id, request.body);
          return reply.code(204).send(null);
        } catch (err) {
          const { status, body } = fail(err);
          return reply.code(status).send(body);
        }
      },
    );

    app.post(
      '/admin/review/source/:nodeId',
      {
        schema: {
          params: z.object({ nodeId: z.string().max(200) }),
          body: ReviewSourceDecision,
          response: { 204: z.null(), 400: ApiErrorBody, 403: ApiErrorBody, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        try {
          await reviewSource(
            deps.db,
            reviewer(request.userEmail),
            request.params.nodeId,
            request.body,
          );
          return reply.code(204).send(null);
        } catch (err) {
          const { status, body } = fail(err);
          return reply.code(status).send(body);
        }
      },
    );

    app.get(
      '/admin/review/summary',
      { schema: { response: { 200: ReviewSummary, 403: ApiErrorBody } } },
      () => reviewSummary(deps.db),
    );

    app.get(
      '/admin/sources',
      { schema: { response: { 200: SourceCatalogue, 403: ApiErrorBody } } },
      async () => ({ sources: await sourceCatalogue(deps.db) }),
    );
  };
