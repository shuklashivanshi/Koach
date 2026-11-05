import { defineConfig } from 'tsup';

// Bundles workspace packages (@koach/*) into dist; npm dependencies stay external and are
// installed in the image by `pnpm deploy --prod`.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  noExternal: [/^@koach\//],
  external: [/^@electric-sql\//],
});
