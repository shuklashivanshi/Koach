import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../deps';
import { ingestCurrentAffairs } from '../services/ca';
import { dispatchReminders } from '../services/reminders';

// Jobs triggered by Cloud Scheduler with a shared secret header (not exposed to learners).
export const internalRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      const secret = deps.config.CRON_SECRET;
      if (!secret || request.headers['x-cron-secret'] !== secret) {
        await reply.code(403).send({ error: 'forbidden' });
      }
    });

    app.post(
      '/internal/reminders',
      { schema: { response: { 200: z.object({ sent: z.number().int() }) } } },
      async () => (deps.push ? dispatchReminders(deps.db, deps.push, deps.now()) : { sent: 0 }),
    );

    app.post('/internal/ca-ingest', async () => ingestCurrentAffairs(deps.db, deps.ai, deps.now()));
  };
