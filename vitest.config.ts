import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts', 'apps/*/vitest.config.ts'],
    // Each PGlite test file boots a whole in-memory Postgres; too many at once starve each other
    // (timeouts) or get OOM-killed on the Cloud Build machine (deploy.yaml sets CI=true).
    maxWorkers: process.env.CI ? 2 : 4,
  },
});
