import { usersRepo } from '@koach/db';
import { MeSchema } from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Deps } from '../../../deps';
import { deleteAccount } from '../../../services/account';

export const meRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    // First authenticated call creates the user row (D-06).
    app.get('/me', { schema: { response: { 200: MeSchema } } }, async (request) => {
      const row = await usersRepo.upsert(deps.db, request.uid, request.userEmail);
      return { uid: row.uid, email: row.email, createdAt: row.createdAt.toISOString() };
    });

    app.delete('/me', async (request, reply) => {
      await deleteAccount(deps, request.uid, request.userEmail);
      return reply.code(204).send();
    });
  };
