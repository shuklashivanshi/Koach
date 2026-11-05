import { defineConfig } from 'tsup';

// One entry per Cloud Run job. Phase 1 has only the migration job; ca-ingest and rebalance
// are added in Phases 4–5.
export default defineConfig({
  entry: ['src/migrate.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  noExternal: [/^@koach\//],
});
