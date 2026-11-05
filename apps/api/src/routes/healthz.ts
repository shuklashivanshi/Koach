import { HealthResponse } from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Deps } from '../deps';

export const healthzRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/healthz', { schema: { response: { 200: HealthResponse } } }, async () => ({
      ok: true as const,
      version: deps.version,
    }));
  };
