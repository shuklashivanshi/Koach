# Phase 1: Foundation & GCP Deploy - Research

**Researched:** 2026-11-06
**Confidence:** Medium–high. Versions come from official changelogs where available. Regional model availability must be verified during execution (D-17).

## Versions (pin exactly at install time; never use `latest`)

| Component | Choice | Evidence |
|---|---|---|
| Expo SDK | **58** (released 2026-10-15) | expo.dev/changelog lists SDK 58 (15 Oct 2026), 57 (30 Jun), 56 (21 May; RN 0.85) |
| Node | **24 LTS** (EOL Apr 2028) | Node 24 left Active LTS on 2026-10-20 and is now in Maintenance; Node 26 became LTS on 2026-10-28; Node 22 reaches EOL Apr 2027 |
| Postgres | **16** on Cloud SQL + `vector` | Supported on Cloud SQL; pgvector is available as an extension |
| Gemini (bulk) | `gemini-3.8-flash` (stable, released 2026-09-02, ≥12-month lifecycle) | Vertex "Model versions and lifecycle" page |
| Gemini (lite) | `gemini-3.5-flash-lite` (stable, released 2026-07-21) | same |
| Embeddings | `gemini-embedding-2` (GA 2026-04-22) | same |
| Retiring, avoid | `gemini-2.5-pro/flash/flash-lite` (retire 2026-10-20), `gemini-3.6-flash` (retires 2026-11-19), `gemini-3.7-flash` (retires 2027-01-28) | same |
| Pro-class | Not chosen yet; `gemini-4-argon` (2026-10-13) is the newest 12-month model, to be evaluated in a later phase | same |

**Why Node 24 over 26:** Node 26 became LTS only days ago. Node 24 is mature with ecosystem-wide support, and its end of life (Apr 2028) covers the whole CSE 2027 cycle.

## Key technical findings

1. **Email code sign-in:** Firebase has no native email-OTP. The standard pattern is: the backend generates and stores a hashed code with an expiry, verifies it, then calls Admin SDK `createCustomToken(uid)`, and the client calls `signInWithCustomToken`. The code store and rate limiting are our responsibility (D-04).
2. **Google Sign-In on Android with React Native Firebase:**
   - `@react-native-google-signin/google-signin` returns an `idToken`, which becomes `GoogleAuthProvider.credential(idToken)` → `signInWithCredential`.
   - This needs the **web client ID** from Firebase, plus the **SHA-1** of the EAS dev keystore registered in Firebase (`eas credentials` shows it).
3. **React Native Firebase in Expo:** needs a dev build (not Expo Go) and config plugins `@react-native-firebase/app` and `@react-native-firebase/auth`, with `google-services.json` referenced from `app.config.ts`.
4. **Cloud Run ↔ Cloud SQL:** use `--add-cloudsql-instances`, connecting via the unix socket `/cloudsql/PROJECT:REGION:INSTANCE`. The `DATABASE_URL` secret uses `host=/cloudsql/...`.
5. **Vertex SDK:** `@google/genai` with `{ vertexai: true, project, location }`. Usage metadata gives token counts for cost logging.
6. **PGlite** runs Postgres in-process (WASM) with a pgvector extension. It is ideal for Drizzle migration + repository tests without Docker.
7. **Cloud Build 2nd-gen GitHub connection:** created once in the console or via `gcloud builds connections create github` (requires the user to authorise the GitHub App in a browser).
8. **Firebase on an existing GCP project:** `firebase projects:addfirebase <projectId>`, then `firebase apps:create android` and `firebase apps:sdkconfig android` to produce `google-services.json`. Enabling the Google provider in Firebase Auth is a console toggle (user step).

## Risks

| Risk | Mitigation |
|---|---|
| A Gemini model isn't served in `asia-south1` | Per-model `location` in config, falling back to `global` (D-17); availability recorded in `MODELS.md` |
| Missing SHA-1 → Google sign-in fails on device | Explicit user_setup step + human-verify checkpoint |
| Email deliverability from Resend's shared domain | Dev uses Resend's onboarding sender to the account owner; a custom domain before public launch |
| Cloud SQL idle cost | `db-f1-micro`, single dev instance, budget alert at ₹2,000 |

## Sources
- [Expo changelog](https://expo.dev/changelog), [Expo SDK 56](https://expo.dev/changelog/sdk-56.md)
- [Vertex AI model versions and lifecycle](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)
- [Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog)
- [Node.js release changes (InfoQ)](https://infoq.com/news/2026/06/nodejs-release-changes), [Node 26 LTS](https://fireup.pro/news/nodejs-26-lts-whats-new-upgrade)
- [React Native Firebase auth reference](https://reference.rnfirebase.io/_react-native-firebase/auth.html)
- [Custom-token email code example](https://github.com/igorjacauna/firebase-layer/commit/16f9049)
