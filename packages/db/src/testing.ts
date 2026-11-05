import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from './client';
import { defaultMigrationsFolder } from './migrate';
import * as schema from './schema';

/** In-memory Postgres (with pgvector) with all migrations applied. No Docker needed. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: defaultMigrationsFolder });
  return { db: db as unknown as Db, close: () => client.close() };
}
