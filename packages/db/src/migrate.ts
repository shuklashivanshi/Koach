import { fileURLToPath } from 'node:url';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { createPgDb } from './client';

export const defaultMigrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

/** Applies all pending migrations to a Postgres database (used by the koach-migrate job). */
export async function runPgMigrations(
  databaseUrl: string,
  migrationsFolder = defaultMigrationsFolder,
): Promise<void> {
  const { db, close } = createPgDb(databaseUrl);
  try {
    await migratePg(db as Parameters<typeof migratePg>[0], { migrationsFolder });
  } finally {
    await close();
  }
}
