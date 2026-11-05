import swagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Deps } from './deps';
import { requireAuth } from './plugins/auth';
import { loggerOptions } from './plugins/logging';
import { healthzRoutes } from './routes/healthz';
import { aiPingRoutes } from './routes/v1/ai/ping';
import { emailAuthRoutes } from './routes/v1/auth/email';
import { meExportRoutes } from './routes/v1/me/export';
import { meRoutes } from './routes/v1/me';

export interface BuildOptions {
  logger?: boolean;
  /** Extra authenticated /v1 route plugins (registered by later plans, e.g. AI routes). */
  protectedRoutes?: ((deps: Deps) => Parameters<FastifyInstance['register']>[0])[];
}

export async function buildApp(deps: Deps, options: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: loggerOptions(options.logger ?? false), trustProxy: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: { info: { title: 'Koach API', version: deps.version } },
    transform: jsonSchemaTransform,
  });
  app.get('/docs/json', { schema: { hide: true } }, () => app.swagger());

  app.setErrorHandler((err, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({ error: 'bad_request' });
    }
    request.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: 'internal' });
  });

  const typed = app.withTypeProvider<ZodTypeProvider>();
  await typed.register(healthzRoutes(deps));
  // Public: email sign-in must work before the user has a token.
  await typed.register(emailAuthRoutes(deps), { prefix: '/v1' });

  // Everything else under /v1 requires a Firebase ID token (D-06).
  await typed.register(
    async (scope) => {
      scope.addHook('onRequest', requireAuth(deps.identity));
      await scope.register(meRoutes(deps));
      await scope.register(meExportRoutes(deps));
      await scope.register(aiPingRoutes(deps));
      for (const routes of options.protectedRoutes ?? []) await scope.register(routes(deps));
    },
    { prefix: '/v1' },
  );

  return app;
}
