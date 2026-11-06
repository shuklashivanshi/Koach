# Phase 1: Foundation & GCP Deploy - Context

**Gathered:** 2026-11-06
**Status:** Ready for planning

<domain>
## Phase Boundary

A deployable skeleton. The Expo app on Shivanshi's Android phone signs in and calls a TypeScript API on Cloud Run backed by Cloud SQL, with working Vertex AI and Text-to-Speech call paths and `deploy.yaml` CI/CD. It also covers data export and account deletion.

Requirements: PLAT-01..06, AUTH-01..03.

**Not in this phase:** syllabus/PYQ data (Phase 2), onboarding (Phase 3), push notifications (Phase 4), Speech-to-Text (Phase 3), any real product screens beyond Welcome / sign-in / a Today placeholder / You (export, delete).

</domain>

<decisions>
## Implementation Decisions

### Device & mobile stack
- **D-01:** Android first. Use an EAS **development build** (APK, internal distribution) on Shivanshi's phone. iOS is deferred, so Sign in with Apple is not needed yet.
- **D-02:** Expo SDK 58 (released 15 Oct 2026), `expo-router`, `expo-dev-client`, `@react-native-firebase/app` + `@react-native-firebase/auth` via config plugins, `@react-native-google-signin/google-signin` for Google.
- **D-03:** The app uses `packages/ui` tokens and fonts (Cormorant Garamond + Literata) from day one. Phase 1 screens: Welcome (UI_SPEC §10.1), Email code entry, Today placeholder (sunlight header + "Your plan arrives after onboarding."), You (Export data, Delete account with the UI_SPEC §11 confirm copy), and a hidden Dev screen (AI ping + TTS play) reachable only in dev builds.

### Authentication
- **D-04:** Sign-in = **Google + 6-digit email code**.
  - **Google:** native Google Sign-In → Firebase credential.
  - **Email code:** `POST /v1/auth/email/start` stores a **hashed** code (SHA-256 with a per-code salt) with a 10-minute expiry and max 5 attempts. Rate limit: 3 starts per 15 min per email and per IP. `POST /v1/auth/email/verify` checks the code, then mints a **Firebase custom token** (firebase-admin), and the app calls `signInWithCustomToken`. Firebase email *links* are not used (Dynamic Links shut down in 2025).
- **D-05:** Email delivery via **Resend**: API key in Secret Manager as `RESEND_API_KEY`, behind an `EmailSender` interface so the provider can be swapped.
  - In `APP_ENV=dev` only, setting `EMAIL_DEV_ECHO=1` also writes the code to server logs, for testing without a mailbox. It is forbidden in prod, and startup fails if it's set there.
- **D-06:** All API routes except `/health` (Cloud Run reserves `/healthz`) and `/v1/auth/email/*` require a Firebase ID token (`Authorization: Bearer`), verified with firebase-admin. The first authenticated request upserts a `users` row (uid, email, created_at).
- **D-07:** Session persistence relies on React Native Firebase's native persistence. No custom token storage.

### Environments & GCP
- **D-08:** Phase 1 builds **`koach-dev` only**. The project ID is `koach-dev-<6-char suffix>`, because project IDs must be globally unique. Prod (`koach-prod-<suffix>`) is created with the same scripts before v1.0 ships.
- **D-09:** Region `asia-south1` for Cloud Run, Cloud SQL, Artifact Registry, GCS. Firebase is added to the same GCP project.
- **D-10:** Budget alert **₹2,000/month** on the dev project, with thresholds at 50% / 90% / 100%.
- **D-11:** The user creates the billing account, runs `gcloud auth login`, `firebase login` and `eas login` themselves (credentials never pass through Claude). Everything else is scripted in `infra/bootstrap.sh` (idempotent, re-runnable).

### Backend
- **D-12:** **Node 24 LTS** for API, jobs and CI. This replaces Node 22 in earlier docs, because Node 22 reaches end of life in Apr 2027, before Mains.
- **D-13:** Fastify 5 + `fastify-type-provider-zod` + `@fastify/swagger` (OpenAPI at `/docs/json`), `@fastify/autoload` loading `apps/api/src/routes/**`, pino JSON logs shaped for Cloud Logging (`severity` field).
- **D-14:** Cloud SQL **Postgres 16** (Enterprise, shared-core `db-f1-micro` for dev), `vector` extension enabled. **Drizzle ORM + drizzle-kit** migrations in `packages/db`. Cloud Run connects via the Cloud SQL unix socket (`--add-cloudsql-instances`).
- **D-15:** Tests use **Vitest**. DB tests use **PGlite** (with its vector extension), so no Docker is needed locally or in CI.

### AI & speech
- **D-16:** Vertex via `@google/genai` (`vertexai: true`). Model IDs come only from `packages/ai/src/models.config.ts`:
  - `bulk` = `gemini-3.8-flash`
  - `lite` = `gemini-3.5-flash-lite`
  - `embed` = `gemini-embedding-2`
  - The Pro-class reasoning model is chosen in a later phase.
- **D-17:** Vertex location defaults to `asia-south1`. If a configured model is not served there, that model's config entry sets `location: "global"`, with a comment. Phase 1 checks availability and records the result in `packages/ai/MODELS.md`. No PII is sent in prompts.
- **D-18:** Text-to-Speech via `@google-cloud/text-to-speech`, voice language `en-IN` (best available Chirp HD voice, recorded in config), MP3 output.
- **D-19:** Every AI/speech call is logged as `{feature, model, input_tokens, output_tokens, chars, est_cost_usd, latency_ms}` to Cloud Logging and to an `ai_calls` table.
- **D-20:** Eval harness: `pnpm eval` runs `packages/ai/evals/*.eval.ts`. Mocked by default; live with `EVAL_LIVE=1`. CI runs the mocked suite.

### Data rights (DPDP)
- **D-21:** `GET /v1/me/export` returns JSON of every row owned by the user, plus a list of their GCS objects. `DELETE /v1/me` deletes the DB rows (FK cascade), the GCS prefix `users/{uid}/` and the Firebase user, and is idempotent.

### CI/CD
- **D-22:** Code is hosted in a **private GitHub repo** (the user creates it and connects the Cloud Build GitHub App as a 2nd-gen repository connection). The trigger runs `deploy.yaml` on push to `main` with `_ENV=dev`.
- **D-23:** `deploy.yaml` uses Node 24 images. The pipeline: install → typecheck/lint/test → build api + jobs images → push → `koach-migrate` job → deploy `koach-api` → smoke-test `/health` (Cloud Run reserves `/healthz`). Phase 1 does **not** deploy `koach-ca-ingest` / `koach-rebalance`, which have no code yet; the draft's step 7 becomes a no-op until Phases 4–5.

### Claude's Discretion
- Internal folder layout inside apps and packages, lint rule details, exact Drizzle table naming (snake_case), the Chirp voice name, and test file organisation.

</decisions>

<specifics>
## Specific Ideas

- The Welcome screen copy is exactly UI_SPEC §10.1: "Koach" / "Study, with a quiet mind." / `Continue with Google` / `Use email instead`.
- The delete-account confirm copy is exactly UI_SPEC §11.
- The Dev screen proves success criterion 4 on the phone itself: tap → Gemini one-line reply + a 2-second en-IN TTS clip plays.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product & rules
- `.planning/PROJECT.md` — Cross-Cutting Rules, Constraints, Key Decisions (source of truth)
- `.planning/REQUIREMENTS.md` — PLAT-01..06, AUTH-01..03
- `.planning/ROADMAP.md` — Phase 1 success criteria

### Design
- `docs/UI_SPEC.md` §2–7 (tokens, type, components), §10.1 (Welcome), §10.12 (You), §11 (copy)

### Infrastructure
- `deploy.yaml` — draft pipeline to finalise
- `docs/PRODUCT_SPEC.md` §7 (NFRs), §8 (architecture, repo layout)

### Research
- `.planning/phases/01-foundation-gcp-deploy/01-RESEARCH.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None. This is a greenfield repo; only planning docs and the draft `deploy.yaml` exist.

### Established Patterns
- None yet. Phase 1 establishes them.

### Integration Points
- `deploy.yaml` expects `apps/api/Dockerfile`, `apps/jobs/Dockerfile`, a `dist/migrate.js` entry in the jobs image, and secrets `DATABASE_URL`, `FIREBASE_PROJECT_ID` (+ `RESEND_API_KEY`, added in this phase).

### Local machine (checked 2026-11-06)
- Node 26 and npm 11 are present. **Not installed:** pnpm, Docker, gcloud, firebase-tools, eas-cli. pnpm comes via corepack; gcloud via Homebrew (user approves); firebase-tools and eas-cli via `pnpm dlx`.

</code_context>

<deferred>
## Deferred Ideas

- iOS build + Sign in with Apple — when iOS is needed
- `koach-prod` project — before v1.0 ships
- Speech-to-Text (Chirp) — Phase 3 (Listen & Recall game)
- Push notifications (FCM) — Phase 4

</deferred>

---

*Phase: 01-foundation-gcp-deploy*
*Context gathered: 2026-11-06*
