import { defineProject } from 'vitest/config';

// PGlite boots slowly when the machine is busy, so give tests and hooks more than the 5s default.
export default defineProject({ test: { name: 'api', testTimeout: 30_000, hookTimeout: 30_000 } });
