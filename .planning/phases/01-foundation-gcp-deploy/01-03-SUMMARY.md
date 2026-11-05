---
phase: 01-foundation-gcp-deploy
plan: 03
status: complete
completed: 2026-11-06
requirements: [AUTH-01, AUTH-03, PLAT-04]
---

# 01-03 Summary: Fastify API core

## What was built
- `apps/api`: Fastify 5 + zod type provider + OpenAPI (`/docs/json`), Cloud Logging-shaped pino logs with auth headers redacted, injectable `Deps` (db, identity, storage, email, clock).
- **Auth:** an onRequest hook on every `/v1` route except `/v1/auth/email/*` verifies the Firebase ID token. `GET /v1/me` upserts the user.
- **Email-code sign-in:**
  - 6-digit code from `randomInt`, stored as a salted SHA-256 hash, 10-minute TTL.
  - Rate limits: 3 starts per 15 min per email and per IP; codes lock after 5 attempts; constant-time compare; a code is burned after use; a uniform 204 response.
  - Codes are sent via Resend.
  - The uid comes from Firebase `getUserByEmail`, creating the user if needed, so Google and email sign-in reach the **same** account. A Firebase custom token is returned.
- **DPDP:**
  - `GET /v1/me/export`: user, AI calls, code timestamps (no hashes), stored files.
  - `DELETE /v1/me`: deletes files, codes, the user row (AI calls cascade) and the Firebase user; idempotent.
- `packages/db` repos: `emailCodesRepo`, `aiCallsRepo`.
- Local dev: `pnpm --filter @koach/api dev` runs on in-memory PGlite with a dev identity (`Bearer dev:<uid>`). It is impossible in prod: config requires all prod settings, and dev email echo is refused there.

## Verification
- 16 API tests (auth, me, email flow incl. rate limits/expiry/lockout, export/delete) — 46 total green; typecheck, lint, format green.
- Local server smoke: `/healthz` 200, `/v1/me` 401 → 200 with a dev token, email start 204 with a dev-echoed code.
- `tsup` bundle builds `dist/server.js`.

## Deviations from plan
- **No `@fastify/autoload`:** routes are registered explicitly in `app.ts`, and later plans add authenticated routes via `buildApp(deps, { protectedRoutes })`. Autoload scans directories at runtime, which breaks once the server is bundled.
- **Same account for both sign-in methods:** the email-code uid comes from Firebase (`getUserByEmail`, else `createUser`) instead of a hash of the email.
- **Clock for timestamps:** `email_codes.created_at` is set from the app clock, so rate-limit windows and tests use one time source.
