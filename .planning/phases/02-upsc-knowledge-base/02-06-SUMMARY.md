---
phase: 02-upsc-knowledge-base
plan: 06
subsystem: knowledge-base
tags: [admin-review, deploy, cloud-run, smoke]
requires:
  - phase: 02-upsc-knowledge-base
    provides: PYQ tags and source map (02-04), strategy KB (02-05)
provides:
  - Admin review API and /admin/review web page (committed earlier as 90ea6d0)
  - Knowledge base live on Cloud SQL via koach-migrate; /v1/kb/stats returns data on Cloud Run
  - infra/smoke.sh now also checks /v1/kb/stats
affects: [Phase 3+ deploys]
status: complete
---

# 02-06: Admin review page, audit, deploy

## What was done

1. **Admin API and page:** already committed in `90ea6d0` (ADMIN_EMAILS allowlist, sample / approve / correct, audit summary, kb_reviews).
2. **Deploy:** pushed `main` and got `deploy.yaml` green on Cloud Build (build `33cacb2b`): verify, image builds, `koach-migrate` (loads the KB into Cloud SQL), `koach-api` deploy and the in-build smoke step.
3. **Live check:** `infra/smoke.sh dev` passes against `koach-api` (health, 401 without token, email-code sign-in, `/v1/me`, `/v1/ai/ping`, `/v1/kb/stats`, export, delete).

## Deploy problems found and fixed (four failed builds before green)

- **verify, test timeouts:** PGlite-backed test files timed out at the 5 s default under load. Raised to 30 s for `apps/api` and `packages/kb` (34eab33).
- **verify, worker SIGKILL (OOM):** one API test file peaks near 2.4 GB. A root `maxWorkers` option is not applied to vitest projects, so two attempts did nothing; `VITEST_MAX_WORKERS=1` on the verify step works (a71d831).
- **deploy-api, container crash on start:** `@google-cloud/speech` was bundled into the ESM output and threw "Dynamic require of events is not supported". Listing it in `apps/api/package.json` keeps it external (bda81e0).

## Not verified

- The audit-accuracy number in the admin page has not been exercised with real reviews; reviewing is the user's job.
- A broken edit to `smoke.sh` aborted one run before its cleanup step, leaving one throwaway `smoke-*@koach.test` user in the dev Firebase project.
