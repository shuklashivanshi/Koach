---
phase: 01-foundation-gcp-deploy
plan: 04
status: complete-pending-live-check
completed: 2026-11-06
requirements: [PLAT-05]
---

# 01-04 Summary: AI + speech wrapper

## What was built
- `@koach/ai`:
  - `models.config.ts` is the only place model IDs live: bulk `gemini-3.8-flash`, lite `gemini-3.5-flash-lite`, embed `gemini-embedding-2`, all in `asia-south1`, with `AI_MODEL_<TIER>` overrides. TTS voice is `en-IN-Chirp3-HD-Aoede`, MP3.
  - `generateText` and `synthesize`: retry on 429/5xx (max 3, jittered backoff), a structured `ai_call` log line, and an `onCall` hook.
- **API:** `vertexAi(db)` persists every call to `ai_calls`. `GET /v1/ai/ping` (authenticated) returns Gemini text + TTS audio + total cost.
- `scripts/check-models.ts`: a live probe of each model at its configured location with a `global` fallback, plus TTS voice availability; it writes `MODELS.md`.
- Eval harness: `pnpm --filter @koach/ai eval` (mock fixtures; `EVAL_LIVE=1` for live). It includes `ping.eval.ts` and a placeholder blocked-names list (to become KB-08 in Phase 2).
- ESLint forbids importing `@google/genai` outside `packages/ai`.

## Verification
- 53 tests green (AI retry/cost/usage, TTS request shape, ping 401/200 + persisted usage); eval 3/3; typecheck, lint, format green.

## Pending
- **Live model check:** runs in 01-05 Task 1, once koach-dev exists.
- **Pricing:** the Vertex pricing page could not be read, so the numbers in `pricing` are estimates (`verified: false`). They only affect cost logging, and must be confirmed before relying on the cost reports.

## Deviations
- **Typed seams:** the TTS and Gemini clients sit behind small interfaces (`TtsLike`, `GenAiLike`), so tests never touch Google.
