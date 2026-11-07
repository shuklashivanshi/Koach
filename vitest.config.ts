import { defineConfig } from 'vitest/config';

// Worker count is set by VITEST_MAX_WORKERS (deploy.yaml sets it to 1 on Cloud Build: each PGlite
// test file peaks near 2.4 GB). A `maxWorkers` option here is not applied to projects.
export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts', 'apps/*/vitest.config.ts'],
  },
});
