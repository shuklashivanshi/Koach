import { existsSync, readFileSync } from 'node:fs';
import { createPgDb, type Db } from '@koach/db';
import { buildApp } from './app';
import { loadConfig } from './config';
import type { Deps } from './deps';
import { vertexAi } from './services/ai';
import { type EmailSender, resendSender } from './services/email-sender';
import { devIdentity, firebaseIdentity } from './services/firebase';
import { webPushSender } from './services/push';
import { gcsStore, memoryStore } from './services/storage';

/** Local development only: keys generated once into apps/api/dev-keys.json (gitignored). */
function devKeys(): Record<string, string> {
  if (process.env.APP_ENV === 'prod') return {};
  const file = new URL('../dev-keys.json', import.meta.url);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>) : {};
}

async function main(): Promise<void> {
  const config = loadConfig({ ...devKeys(), ...process.env });

  let db: Db;
  if (config.DATABASE_URL) {
    db = createPgDb(config.DATABASE_URL).db;
  } else {
    if (config.APP_ENV === 'prod') throw new Error('DATABASE_URL is required in prod');
    // Local development: in-memory Postgres with migrations applied.
    const { createTestDb } = await import('@koach/db/testing');
    db = (await createTestDb()).db;
    // Load the knowledge base so the KB routes have data locally (Cloud SQL gets it from koach-migrate).
    const { loadKb, readKb } = await import('@koach/kb');
    const kbDir = new URL('../../../packages/kb/data', import.meta.url).pathname;
    console.log('kb loaded', await loadKb(db, await readKb(kbDir)));
  }

  // The dev identity (accepts `Bearer dev:<uid>`) is only possible outside prod without Firebase.
  const identity = config.FIREBASE_PROJECT_ID
    ? firebaseIdentity(config.FIREBASE_PROJECT_ID)
    : config.APP_ENV === 'dev'
      ? devIdentity()
      : undefined;
  if (!identity) throw new Error('FIREBASE_PROJECT_ID is required in prod');

  // Without a Resend key (localhost) emails are printed to the terminal instead.
  const email: EmailSender = config.RESEND_API_KEY
    ? resendSender(config.RESEND_API_KEY, config.EMAIL_FROM)
    : {
        send: (m) => {
          console.log(`\n  ✉  ${m.to}: ${m.text}\n`);
          return Promise.resolve();
        },
      };

  const deps: Deps = {
    config,
    db,
    identity,
    storage: config.GCS_BUCKET ? gcsStore(config.GCS_BUCKET) : memoryStore(),
    email,
    ai: vertexAi(db),
    push:
      config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY
        ? webPushSender(config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY, config.VAPID_SUBJECT)
        : null,
    now: () => new Date(),
    version: config.K_REVISION ?? 'local',
  };

  const app = await buildApp(deps, { logger: true });
  await app.listen({ host: '0.0.0.0', port: config.PORT });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
