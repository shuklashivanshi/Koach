import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
/** Driver-agnostic handle: node-postgres in Cloud Run, PGlite in tests and local dev. */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export function createPgDb(databaseUrl: string): { db: Db; close: () => Promise<void> } {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  return { db: drizzle(pool, { schema, casing: 'snake_case' }), close: () => pool.end() };
}
