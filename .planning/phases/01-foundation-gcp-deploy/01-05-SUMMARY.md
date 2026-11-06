---
phase: 01-foundation-gcp-deploy
plan: 05
status: complete
completed: 2026-11-06
requirements: [PLAT-02]
---

# 01-05 Summary: deploy.yaml and CI/CD

## What was built
- **`deploy.yaml` pipeline:** install, then verify (typecheck, lint, shellcheck, Vitest + Jest, mocked evals), then build and push the api and jobs images, then the `koach-migrate` Cloud Run job, then deploy `koach-api`, then a smoke test (`/health` returns 200, `/v1/me` returns 401). It runs as the `koach-build` service account.
- **Live API:** `koach-api` at https://koach-api-th4xn6zeba-el.a.run.app (asia-south1, scale to zero).
- **Code repo:** https://github.com/shuklashivanshi/Koach (private).
- **`infra/trigger.sh`:** creates the 2nd-gen GitHub connection `koach-gh`, the repository link, and the trigger `koach-dev-main` (push to `main` runs `deploy.yaml`).

## Verification
- Manual `gcloud builds submit` deploys succeeded.
- `infra/smoke.sh dev` passes 11/11, including a Gemini reply with en-IN TTS audio.
- A push to `main` (e6b00b7) started the trigger.

## Deviations from plan
- **Health route:** `/healthz` is reserved by Cloud Run, so the route is `/health` everywhere.
- **Substitutions:** `substitutionOption: ALLOW_LOOSE` is set, because `_ENV` is informational.
- **Test timeout:** Jest gets a 20s timeout for cold CI machines.
