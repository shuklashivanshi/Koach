import { createTestDb } from '@koach/db/testing';
import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildOptions } from '../src/app';
import { loadConfig } from '../src/config';
import { recordingPush } from '../src/services/push';
import type { Deps } from '../src/deps';
import { recordingSender } from '../src/services/email-sender';
import type { IdentityProvider } from '../src/services/firebase';
import { memoryStore } from '../src/services/storage';

/** Fake Firebase: tokens are `valid:<uid>:<email>`; records deletions and minted tokens. */
export function fakeIdentity(): IdentityProvider & { deleted: string[]; minted: string[] } {
  const deleted: string[] = [];
  const minted: string[] = [];
  return {
    deleted,
    minted,
    verifyIdToken(token) {
      const [kind, uid, email] = token.split(':');
      if (kind !== 'valid' || !uid) return Promise.reject(new Error('bad token'));
      return Promise.resolve({ uid, email: email || null });
    },
    resolveUidForEmail: (email) => Promise.resolve(`uid-for-${email}`),
    createCustomToken(uid) {
      minted.push(uid);
      return Promise.resolve(`custom-token-for-${uid}`);
    },
    deleteUser(uid) {
      deleted.push(uid);
      return Promise.resolve();
    },
  };
}

export async function buildTestApp(
  overrides: Partial<Deps> = {},
  options: BuildOptions = {},
): Promise<{
  app: FastifyInstance;
  deps: Deps & {
    identity: ReturnType<typeof fakeIdentity>;
    email: ReturnType<typeof recordingSender>;
    storage: ReturnType<typeof memoryStore>;
  };
  close: () => Promise<void>;
}> {
  const { db, close: closeDb } = await createTestDb();
  const deps = {
    config: loadConfig({ APP_ENV: 'dev' }),
    db,
    identity: fakeIdentity(),
    storage: memoryStore(),
    email: recordingSender(),
    ai: {
      text: () => Promise.resolve({ text: 'Keep going.', model: 'fake-model', costUsd: 0.0001 }),
      speak: () => Promise.resolve({ audioBase64: 'QUJD', costUsd: 0.0002 }),
      json: () => Promise.reject(new Error('json not stubbed in this test')),
      transcribe: () => Promise.resolve({ text: 'monsoon delta', costUsd: 0.0001 }),
    },
    push: recordingPush(),
    now: () => new Date(),
    version: 'test',
    ...overrides,
  } as Deps & {
    identity: ReturnType<typeof fakeIdentity>;
    email: ReturnType<typeof recordingSender>;
    storage: ReturnType<typeof memoryStore>;
  };
  const app = await buildApp(deps, options);
  return {
    app,
    deps,
    close: async () => {
      await app.close();
      await closeDb();
    },
  };
}

export const bearer = (uid: string, email = '') => ({
  authorization: `Bearer valid:${uid}:${email}`,
});
