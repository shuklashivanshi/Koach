import { MeSchema } from '@koach/shared';
import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from './client';
import { usersRepo } from './repos/users';
import { createTestDb } from './testing';

describe('users (PGlite)', () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(() => close());

  it('migrations enable pgvector', async () => {
    const res: unknown = await db.execute(
      sql`select extname from pg_extension where extname = 'vector'`,
    );
    expect((res as { rows: unknown[] }).rows).toHaveLength(1);
  });

  it('round-trips a user that satisfies the API contract', async () => {
    await usersRepo.upsert(db, 'u1', 'shivanshi@example.com');
    const row = await usersRepo.get(db, 'u1');
    expect(row).toBeDefined();
    const me = MeSchema.parse({
      uid: row!.uid,
      email: row!.email,
      createdAt: row!.createdAt.toISOString(),
    });
    expect(me.email).toBe('shivanshi@example.com');
  });

  it('upsert is idempotent and keeps an existing email when none is given', async () => {
    await usersRepo.upsert(db, 'u1', 'a@b.co');
    await usersRepo.upsert(db, 'u1', null);
    expect((await usersRepo.get(db, 'u1'))?.email).toBe('a@b.co');
  });
});
