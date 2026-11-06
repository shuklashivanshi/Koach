---
phase: 06-memory-cues-nudges
status: complete
completed: 2026-11-06
requirements: [CUE-01, CUE-02, CUE-03, CUE-04, CUE-05, CUE-06, CUE-07, CUE-08, NUDGE-01, NUDGE-02, NUDGE-03]
---

# Phase 6 Summary: Memory cues and nudges

## Built
- **Database (0007):** `node_facts` (shared, verified), `cues` (per user/node/format, with rating), `memory_palaces`, `nudge_log`, `coach_notes`, `wellbeing`.
- **`@koach/lpt` cue rules:** the format ↔ pattern map, and `chooseFormat` (60/25/15, deterministic per node and day). A distribution test confirms the mix.
- **Cue service:**
  - A facts base per node: generated, then verified by a second pass.
  - 12 formats, each generated only from the facts and guard-checked.
  - **Mnemonics and chants must decode back to every fact** (blind decode + judge); one retry, then dropped.
  - Palace placements use the learner's own rooms. Cloze → FSRS cards.
  - Blurting and teach-back are graded against the facts or why-steps; blurting feeds the reading/writing score.
  - 👍/👎 nudges the pattern score (LPT-03). TTS audio for spoken sheets, chants and mnemonics; a 14-day playlist.
- **Coaching:**
  - Nudge rules (idle ≥2 days, a studied section untouched ≥7 days, first pass behind the straight-line pace): ≤3 a day, ≥3 hours apart, never in work or quiet hours. Gemini writes the copy in tone with limits and the guard, falling back to templates.
  - Sunday 18:00 coach note (rules compute kept/slipped; Gemini writes 3 lines).
  - Well-being check-in Sunday to Tuesday; Heavy → ×0.8 planned minutes for the next 7 days.
- **App:**
  - "Make it stick" screen with See/Hear/Write/Do/Why switching, a renderer per format, sequence drill, play button, grading and rating.
  - Memory palace setup and the "Listen and revise" playlist.
  - Coach note and check-in on Today.
  - Entry points from Learn (done), Revise and You.

## Verification
- 5 cue/coach API tests and 1 cue-rule test; 122 Vitest + 14 Jest pass.
- **Live in the browser:** a cue sheet for a GS1 culture node, and a rhyme mnemonic that passed the decode check.

## Follow-ups
- Generation takes 30–80s per first cue (facts + cue + decode). Pre-generate cues for tomorrow's Learn nodes in the nightly job.
