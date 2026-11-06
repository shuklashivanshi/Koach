// koach-migrate Cloud Run job: applies pending Drizzle migrations, then loads the knowledge-base
// seed (packages/kb/data), before each API deploy.
import { existsSync } from 'node:fs';
import { createPgDb, runPgMigrations } from '@koach/db';
import { loadKb, readKb } from '@koach/kb';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
// The image copies packages/db/migrations to /app/migrations and packages/kb/data to /app/kb-data.
const folder = process.env.MIGRATIONS_DIR ?? '/app/migrations';
const kbDir = process.env.KB_DATA_DIR ?? '/app/kb-data';

const log = (message: string, fields: Record<string, unknown>) =>
  console.log(JSON.stringify({ severity: 'INFO', message, ...fields }));

let started = Date.now();
await runPgMigrations(url, folder);
log('migrations_applied', { folder, ms: Date.now() - started });

if (existsSync(kbDir)) {
  started = Date.now();
  const { db, close } = createPgDb(url);
  try {
    const counts = await loadKb(db, await readKb(kbDir));
    log('kb_loaded', { ...counts, ms: Date.now() - started });
  } finally {
    await close();
  }
}
