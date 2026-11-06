# Phase 3: Onboarding & Learning Pattern Test - Context

**Gathered:** 2026-11-06 (autonomous smart discuss; 3 grey areas answered by the user)
**Status:** Ready for planning

<domain>
## Phase Boundary
Koach learns about the learner: availability, starting level by subject, and learning-pattern strengths.
Requirements: PROF-01, PROF-02, LPT-01, LPT-02, LPT-03.
**Not in this phase:** daily plans and the FSRS card store (Phase 4); cue generation (Phase 6). The LPT-03 updates from cue recall are built as a scoring function plus an event endpoint, which Phase 6 feeds.
</domain>

<decisions>
## Implementation Decisions

### User decisions
- **D-01: onboarding = profile + diagnostic** (≤15 min). The Learning Pattern Test is the first card on Today afterwards, and can be taken at any time.
- **D-02: the diagnostic is 20 Prelims GS-I PYQs** from the last 10 years, stratified across subjects by the bank's own weightage, with official answer keys. Questions with no key or a dropped key are excluded.
  - Results seed per-subject levels: per-section accuracy is blended with the self-assessment.
  - If the diagnostic is skipped, levels come from the self-assessment alone.
- **D-03: Listen & Recall accepts typed or spoken answers.**
  - Spoken answers are recorded in the browser (MediaRecorder; expo-audio later on the phone) and transcribed with Cloud Speech-to-Text v2 (Chirp, `asia-south1`, `en-IN`).
  - The audio is discarded after transcription and is never stored.

### Profile (PROF-01)
- **D-04: `learner_profiles` table:**
  - `target` (default `cse-2027`)
  - `weekday_minutes` (Mon–Sun array)
  - `work_hours` and `quiet_hours` (local time ranges)
  - `self_assessment` (per GS section: new | some | strong)
  - `nudge_tone` (default `gentle`)
  - `timezone` (default `Asia/Kolkata`)
  - `onboarded_at`
- **D-05: subject levels** live in `subject_levels` (uid, section_id, level 0..1, source = self | diagnostic). Phase 4 reads them to seed mastery.

### Learning Pattern Test (LPT-01..03)
- **D-06: four games in random order**, then a delayed recall round at least 8 minutes after the first game ends.
  - **Map Pins:** 7 places on an India map (SVG with fixed lat/long projection) shown for 20s, then placed back. Score = 1 − mean distance error / max.
  - **Pattern Grid:** a 5×5 grid, sequences from 3 to 9 cells. Score = span reached.
  - **Listen & Recall:** TTS reads a list of 5–9 items once; recall by typing or speaking. Score = items recalled / items, case and order free.
  - **Read & Write Back:** a ~120-word UPSC-flavoured passage shown for 60s; write the key points. Gemini (lite) scores idea units against a fixed key.
  - **Arrange & Trace:** drag 6 event cards into chronological order while they're shown, then repeat from memory. Score = Kendall-tau order accuracy. The river trace is deferred to the phone build (touch); web uses ordering only.
  - **Delayed recall:** one short probe per game (re-place 3 pins, recall the list, recall the passage's points, re-order the cards).
- **D-07: score per pattern** = round(100 × (0.6 × immediate + 0.4 × delayed)), each game normalised 0..1. Visual = mean of Map Pins and Pattern Grid.
  - Shown as four 0–100 bars plus one plain line ("You recall best what you see and arrange; listening is close behind."), never a single-type label.
  - A result is flagged `low_confidence` if the tab was hidden for more than 20s or any game was skipped.
- **D-08: test content** is a fixed, versioned bank in `packages/lpt` (game items, passage, idea-unit key, place coordinates). There are 2 parallel forms (A/B) so a retest doesn't repeat.
- **D-09: LPT-03 updates.**
  - `POST /v1/lpt/evidence` (pattern, success 0..1) applies a Bayesian-style update: score' = score + k × (100 × success − score), k = 0.05.
  - `retestDue` = 56 days after the last test.

### API and app
- **Routes:** `/v1/profile` (GET/PUT), `/v1/diagnostic` (GET questions, POST answers → levels), `/v1/lpt` (GET form, POST results, GET profile), `/v1/lpt/score-recall` (Gemini idea-unit scoring), `/v1/speech/transcribe` (POST audio → text), `/v1/lpt/evidence`.
- **Web app:** onboarding flow (≤6 screens) shown when the profile isn't onboarded. Today shows the LPT card until it has been taken, then the strength profile.
- **UI:** UI_SPEC tokens, minimal copy; no learner-facing text names any person, institute or platform.

### Claude's Discretion
- Game visuals, exact copy (minimal), and the item banks.
</decisions>

<canonical_refs>
- `.planning/research/LEARNING-PATTERNS.md` §2 (the test) and §3 (pattern → method mapping)
- `.planning/REQUIREMENTS.md` PROF-01/02, LPT-01..03; `docs/UI_SPEC.md` (onboarding, profile screens)
- `packages/kb` (diagnostic PYQs, sections, weightage)
</canonical_refs>
