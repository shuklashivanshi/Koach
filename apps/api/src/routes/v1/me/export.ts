import { ExportBundleSchema } from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Deps } from '../../../deps';
import { exportAccount } from '../../../services/account';

export const meExportRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/me/export', { schema: { response: { 200: ExportBundleSchema } } }, (request) =>
      exportAccount(deps, request.uid, request.userEmail),
    );
  };
