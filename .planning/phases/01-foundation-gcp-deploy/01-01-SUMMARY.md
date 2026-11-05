---
phase: 01-foundation-gcp-deploy
plan: 01
status: complete
completed: 2026-11-06
requirements: [PLAT-03, PLAT-04]
---

# 01-01 Summary: Monorepo, shared, db, ui

## What was built
- pnpm 12.15.0 workspace (`apps/*`, `packages/*`), strict TypeScript 6.0.3, ESLint 10 (type-checked) + Prettier, Vitest 5 projects.
- `@koach/shared`: zod API contract (Me, EmailStart/Verify, ExportBundle, AiPing, Health, ApiError).
- `@koach/db`: Drizzle schema (`users`, `email_codes`, `ai_calls` with cascade FK), migrations `0000_enable_vector` + `0001_initial_tables`, node-postgres client, `runPgMigrations`, PGlite `createTestDb`, `usersRepo`.
- `@koach/ui`: Light Academia tokens (light + lamplight colours, sunlight, fonts, type, space, radius, motion, layout) and a WCAG contrast helper.

## Verification
- `pnpm -r typecheck`, `pnpm lint`, `pnpm test` (30 tests), `pnpm format` and `drizzle-kit check` are all green. No Docker used.

## Deviations from plan
- **Module resolution:** `module: preserve` + `moduleResolution: bundler` instead of NodeNext. Every runtime path is bundled (tsup for api/jobs, Metro for mobile, Vitest for tests), so no `.js` import suffixes are needed.
- **Vitest config:** a root `vitest.config.ts` with `test.projects` replaces `vitest.workspace.ts` (the Vitest 5 API).
- **pgvector for tests:** PGlite 0.5.15 + `@electric-sql/pglite-pgvector` 0.0.16 (vector moved to its own package).
- **TypeScript 6.0.3**, not 7.x: typescript-eslint supports TypeScript <6.1.
- **Node version:** `engines.node >=24` (not `<25`), because the local machine runs Node 26; CI and containers use Node 24.
- **pnpm install location:** installed in `~/.local` (no corepack in Node 26, and a global npm install needs sudo).
- **Formatting scope:** `.prettierignore` excludes planning and docs Markdown, so Prettier never rewrites them.
