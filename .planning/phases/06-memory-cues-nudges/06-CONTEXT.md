# Phase 6: Memory Cues & Nudges - Context

**Gathered:** 2026-11-06 (autonomous; follows PROJECT.md 2.2, research/LEARNING-PATTERNS.md §3)

<decisions>
- **D-01: one verified facts base per node.** 5–8 key facts are generated once from the node title and source, checked by a second pass, and cached in `node_facts`. Every cue format is generated from these facts, never from free recall, so cues can be verified against them.
- **D-02: formats.**
  - See: palace placements, mind-map, timeline
  - Hear: spoken cue sheet, chant, mnemonic
  - Write: cue sheet (≤12 lines), cloze, blurting
  - Do: sequence, flowchart
  - Why: first principles plus teach-back
  - Cues are cached per user, node and format (palace placements depend on the user's own rooms).
- **D-03: decode check (CUE-04).** Every mnemonic, chant and rhyme is decoded blind by a second pass into facts and compared fact by fact. It's shown only if every fact is recovered; otherwise it's regenerated once, then dropped.
- **D-04: default format (CUE-08).** Rules decide by profile weight: 60% strongest, 25% second, 15% split between the others. The choice is deterministic per node and day. The learner can switch format and rate cues 👍/👎.
- **D-05: evidence (LPT-03).** A 👍 is evidence 0.7 for that format's pattern, a 👎 0.3. A blurting score is direct evidence for reading/writing. Every learner gets cloze → FSRS cards (CUE-01) and the Why format (CUE-07).
- **D-06: audio.** Spoken cue sheets and chants come as TTS (`/v1/cues/:id/audio`). The playlist is the spoken cues for nodes studied or due in the last 14 days, played back to back in the web app.
- **D-07: nudges (NUDGE-01).**
  - Rules run in the 15-minute dispatcher, at most 3 a day across nudge types, never in work or quiet hours, at least 3 hours apart.
  - Triggers: a slipping subject (a studied section untouched for 7 or more days), an approaching deadline (first-pass coverage behind the straight-line target), long idle (no activity for 2 or more days).
  - Gemini writes the copy in the user's tone with ≤30/≤60 character limits and the naming guard; it falls back to a template.
- **D-08: Sunday coach note (NUDGE-02).** Rules compute kept/slipped over the week; Gemini writes 3 lines; it's stored, sent Sunday 18:00, and shown on Today until it's read.
- **D-09: well-being check-in (NUDGE-03).** It's shown on Today from Sunday to Tuesday until answered (Light · Fine · Heavy). Heavy reduces the next 7 days' planned minutes by 20% ("Next week is lighter.").
</decisions>
