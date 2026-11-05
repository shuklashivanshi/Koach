import {
  ApiErrorBody,
  EmailStartRequest,
  EmailVerifyRequest,
  EmailVerifyResponse,
} from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Deps } from '../../../deps';
import { startEmailSignIn, verifyEmailSignIn } from '../../../services/email-codes';

export const emailAuthRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.post(
      '/auth/email/start',
      { schema: { body: EmailStartRequest } },
      async (request, reply) => {
        const result = await startEmailSignIn(deps, request.body.email, request.ip, request.log);
        if (result === 'rate_limited') return reply.code(429).send({ error: 'too_many_requests' });
        // Same response whether or not an account exists, so emails can't be enumerated.
        return reply.code(204).send();
      },
    );

    app.post(
      '/auth/email/verify',
      {
        schema: {
          body: EmailVerifyRequest,
          response: { 200: EmailVerifyResponse, 400: ApiErrorBody, 429: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const result = await verifyEmailSignIn(deps, request.body.email, request.body.code);
        if (result.kind === 'too_many_attempts') {
          return reply.code(429).send({ error: 'too_many_requests' });
        }
        if (result.kind === 'invalid') return reply.code(400).send({ error: 'invalid_code' });
        return { customToken: result.customToken };
      },
    );
  };
