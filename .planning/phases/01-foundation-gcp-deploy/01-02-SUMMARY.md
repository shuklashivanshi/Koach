---
phase: 01-foundation-gcp-deploy
plan: 02
status: complete
completed: 2026-11-06
requirements: [PLAT-01]
---

# 01-02 Summary: GCP bootstrap

## What was built
- **`infra/bootstrap.sh <env>`** (idempotent, safe to re-run) creates:
  - project `koach-dev-8cf0a5`, its billing link and the APIs
  - Artifact Registry `koach`
  - service accounts `koach-api`, `koach-jobs`, `koach-build` with least-privilege roles
  - Cloud SQL `koach-pg` (Postgres 16, `db-f1-micro`, asia-south1), database `koach`, user `koach_app`
  - secrets `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `RESEND_API_KEY`
  - bucket `koach-dev-8cf0a5-user-data`
  - a ₹2,000/month budget
  - Firebase Android app `com.koach.app`, with `google-services.json` (gitignored) and `GOOGLE_WEB_CLIENT_ID` recorded
- `infra/verify.sh` (28 checks), `infra/smoke.sh` (live email sign-in → me → AI ping → export → delete; dev only), `infra/register-sha1.sh`, and `infra/lib.sh` (step, retry, set_env_value, firebase_cli).
- How secrets are handled:
  - The Resend key comes from `RESEND_API_KEY_INPUT` or a hidden prompt and goes only to Secret Manager.
  - The scripts never print secrets.

## Verification
- `infra/verify.sh dev`: 28/28 pass.
- `infra/smoke.sh dev`: 11/11 pass against the live API.
- `shellcheck -x infra/*.sh` is clean.

## Deviations from plan
- **Retries:** IAM and Artifact Registry steps retry, because of propagation delays and IAM ETag conflicts.
- **Budget quota project:** budget commands pass `--billing-project`, and ADC needs a quota project (`gcloud auth application-default set-quota-project`).
- **Firebase terms:** Firebase was added in the console by the user, because the Firebase terms must be accepted interactively.
- **GitHub connection:** the Cloud Build service agent gets `roles/secretmanager.admin` so the 2nd-gen GitHub connection can store its token.
- **Resend 403:** Resend returns 403 until a sending domain is verified. In dev, the code echo in logs covers this; a verified domain is needed before real users.
