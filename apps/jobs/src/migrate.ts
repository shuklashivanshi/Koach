// koach-migrate Cloud Run job: applies pending Drizzle migrations before each API deploy.
import { runPgMigrations } from '@koach/db';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
// The image copies packages/db/migrations to /app/migrations.
const folder = process.env.MIGRATIONS_DIR ?? '/app/migrations';

const started = Date.now();
await runPgMigrations(url, folder);
console.log(
  JSON.stringify({
    severity: 'INFO',
    message: 'migrations_applied',
    folder,
    ms: Date.now() - started,
  }),
);
