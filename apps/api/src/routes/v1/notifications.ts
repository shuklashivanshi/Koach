import { schema, usersRepo } from '@koach/db';
import {
  NotificationSettings,
  NotificationSettingsResponse,
  PushSubscriptionBody,
} from '@koach/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../deps';
import { getPrefs, reminderCopy } from '../../services/reminders';

const s = schema;

// Reminder settings and push subscriptions (NOTIF-01/02).
export const notificationRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      '/notifications',
      { schema: { response: { 200: NotificationSettingsResponse } } },
      async (request) => ({
        ...(await getPrefs(deps.db, request.uid)),
        publicKey: deps.config.VAPID_PUBLIC_KEY ?? null,
      }),
    );

    app.put(
      '/notifications',
      { schema: { body: NotificationSettings, response: { 200: NotificationSettingsResponse } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        await deps.db
          .insert(s.notificationPrefs)
          .values({ uid: request.uid, ...request.body })
          .onConflictDoUpdate({ target: s.notificationPrefs.uid, set: request.body });
        return { ...request.body, publicKey: deps.config.VAPID_PUBLIC_KEY ?? null };
      },
    );

    app.post(
      '/push/subscribe',
      { schema: { body: PushSubscriptionBody, response: { 204: z.null() } } },
      async (request, reply) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        await deps.db
          .insert(s.pushSubscriptions)
          .values({ uid: request.uid, ...request.body })
          .onConflictDoUpdate({
            target: s.pushSubscriptions.endpoint,
            set: { uid: request.uid, keys: request.body.keys },
          });
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/push/unsubscribe',
      { schema: { body: z.object({ endpoint: z.url() }), response: { 204: z.null() } } },
      async (request, reply) => {
        await deps.db
          .delete(s.pushSubscriptions)
          .where(
            and(
              eq(s.pushSubscriptions.uid, request.uid),
              eq(s.pushSubscriptions.endpoint, request.body.endpoint),
            ),
          );
        return reply.code(204).send(null);
      },
    );

    /** Sends one sample reminder to this user's devices now (to check notifications work). */
    app.post('/push/test', { schema: { response: { 204: z.null() } } }, async (request, reply) => {
      const subs = await deps.db
        .select()
        .from(s.pushSubscriptions)
        .where(eq(s.pushSubscriptions.uid, request.uid));
      const { tone } = await getPrefs(deps.db, request.uid);
      for (const sub of subs) {
        await deps.push?.send(
          { endpoint: sub.endpoint, keys: sub.keys },
          { ...reminderCopy('plan_ready', tone, 3), url: '/today' },
        );
      }
      return reply.code(204).send(null);
    });
  };
