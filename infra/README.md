# infra

Scripts that create and check Koach's Google Cloud + Firebase environments. Each environment is
described by `env/<env>.env` (committed, no secrets).

| Script | What it does |
|---|---|
| `bootstrap.sh <env>` | Creates everything for one environment. Idempotent: re-running only fills gaps. |
| `verify.sh <env>` | Read-only ✓/✗ check of every resource. Exits 1 if anything is missing. |

## One-time steps you do yourself (credentials never pass through Claude)

1. **Billing account.** console.cloud.google.com → Billing → *Create account*. Copy its ID
   (`XXXXXX-XXXXXX-XXXXXX`) into `env/dev.env` as `BILLING_ACCOUNT=`. The budget alert is in
   `BUDGET_CURRENCY` (INR), which must match the billing account's currency.
2. **Google Cloud CLI.** Install from <https://cloud.google.com/sdk/docs/install> (macOS: download
   the archive, run `./google-cloud-sdk/install.sh`), then:
   ```
   gcloud auth login
   gcloud auth application-default login
   ```
3. **Firebase CLI login.** `pnpm dlx firebase-tools@15.34.1 login`
4. **Resend.** Create an account at resend.com and an API key with sending access. `bootstrap.sh`
   asks for it once (hidden input) and stores it in Secret Manager as `RESEND_API_KEY`.

## Run

```
infra/bootstrap.sh dev
```

Then enable Google sign-in: Firebase console → your project → Authentication → Sign-in method →
Google → Enable → Save. Re-run `infra/bootstrap.sh dev`: it downloads the updated
`google-services.json` and records `GOOGLE_WEB_CLIENT_ID`. Finally:

```
infra/verify.sh dev
```

## What gets created

- **Project:** `koach-<env>-<suffix>`, linked to billing.
- **APIs:** Cloud Run, Cloud SQL, Artifact Registry, Cloud Build, Secret Manager, Vertex AI, Text-to-Speech, Speech-to-Text, Storage, Scheduler, Pub/Sub, Budgets, Firebase, Identity Toolkit.
- **Service accounts:**
  - `koach-api`: Cloud SQL, Vertex AI, secrets, Firebase Auth admin, objectAdmin on the user-data bucket, and token creator on itself to sign Firebase custom tokens.
  - `koach-jobs`: Cloud SQL, Vertex AI, secrets.
  - `koach-build`: deploys Cloud Run services and jobs, pushes images.
- **Cloud SQL:** `koach-pg` (Postgres 16, Enterprise, `db-f1-micro`, `asia-south1`, daily backups), database `koach`, user `koach_app`. The password is generated and stored only in Secret Manager inside `DATABASE_URL`.
- **Secrets:** `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `RESEND_API_KEY`.
- **Bucket:** `gs://<project>-user-data` (uniform access, public access prevented).
- **Budget:** 2,000 INR per month, alerts at 50/90/100%.
- **Firebase:** added to the project, with the Android app `com.koach.app`. `apps/mobile/google-services.json` is written locally and is gitignored.

## Production

Copy `env/dev.env` to `env/prod.env`, clear `PROJECT_ID` and `GOOGLE_WEB_CLIENT_ID`, adjust the
budget and tier, then run the same two scripts with `prod`.
