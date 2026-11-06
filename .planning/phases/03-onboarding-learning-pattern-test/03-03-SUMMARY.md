---
phase: 03-onboarding-learning-pattern-test
plan: 03
status: complete
completed: 2026-11-06
requirements: [LPT-01, LPT-02, LPT-03]
---

# 03-03 Summary: LPT API + speech-to-text

- **`/v1/lpt/form`:** alternates forms A and B. The recall lists are never sent as text; `/v1/lpt/audio/:form/:list` serves them as TTS audio.
- **`/v1/lpt/results`:** everything is scored on the server. Read & Write Back is scored by Gemini lite against the fixed idea units, with schema output.
  - A result is flagged low-confidence if the tab was hidden for more than 20s or any game was skipped.
- **`/v1/lpt/profile`** returns the scores, the line and the retest date. **`/v1/lpt/evidence`** applies the LPT-03 updates.
- **`/v1/speech/transcribe`:** Chirp via `@koach/ai` `transcribe()`. The audio is not stored.
- **Deviation:** no Chirp model serves en-IN in asia-south1 (checked live), so it uses `chirp_2` in `asia-southeast1` (recorded in MODELS.md). `roles/speech.client` was added to bootstrap and verify.
- **Tests:** 4 API tests and 1 unit test, plus a live TTS → STT round trip.
