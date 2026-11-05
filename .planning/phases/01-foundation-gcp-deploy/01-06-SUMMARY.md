---
phase: 01-foundation-gcp-deploy
plan: 06
status: complete
completed: 2026-11-06
requirements: [PLAT-06, AUTH-01, AUTH-02, AUTH-03]
---

# 01-06 Summary: Expo app shell

## What was built
- `apps/mobile`: Expo SDK 58 (React Native 0.88, React 19.3) with Expo Router (`src/app`), dev client, React Native Firebase auth, Google Sign-In, Literata + Cormorant Garamond fonts, Phosphor Light icons, and `@koach/ui` tokens (no raw hex in screens).
- **Screens:**
  - Welcome (UI_SPEC §10.1 copy, window engraving)
  - Email sign-in (send code → 6-digit code → `signInWithCustomToken`, resend after 30s)
  - Today placeholder (sunlight by hour, "Setting your desk…")
  - You (Export data via the share sheet, Sign out, Delete account with the UI_SPEC §11 confirm copy)
  - Dev (Ping AI + audio playback), gated to dev builds
- `Stack.Protected` guards route signed-in and signed-out users. The session persists through React Native Firebase, and any API 401 signs the user out.
- **Typed API client:** zod-parsed responses from `@koach/shared`, the ID token attached automatically, and typed `ApiError` codes.
- `app.config.ts` (package `com.koach.app`, `googleServicesFile` from the `GOOGLE_SERVICES_JSON` EAS file env var) and `eas.json` with a `development` APK profile.

## Verification
- jest-expo: 14 tests (API client contract/auth/errors/401, Google + email sign-in, persisted session, 401 sign-out, export, delete confirm/keep, dev screen gating).
- `tsc --noEmit` clean; `expo-doctor` 20/20; `expo config` resolves with all plugins.
- Root `pnpm test` now runs Vitest (53) + mobile Jest (14).

## Deviations from plan
- **Route folder:** routes live in `src/app/` (current Expo Router convention) instead of `app/`.
- **Auth layer:** a thin adapter, `src/auth/firebase.ts`, wraps React Native Firebase and Google Sign-In so tests mock one module.
- **Async test API:** React Native Testing Library 14 has an async `render`/`fireEvent`, so the tests await them.
- **Missing peers:** `expo-asset` and `react-native-worklets` were installed after expo-doctor flagged them.
- **Template leftover:** the Expo template's `.claude/settings.json` (it enabled a Claude plugin) was removed. The template's `AGENTS.md` is kept as guidance.
- **Linting:** the mobile app is excluded from the root ESLint run (the Node-focused config); it relies on `tsc` + tests for now. `expo lint` setup is a follow-up.
