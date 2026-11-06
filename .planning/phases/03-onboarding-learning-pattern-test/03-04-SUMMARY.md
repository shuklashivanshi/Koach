---
phase: 03-onboarding-learning-pattern-test
plan: 04
status: complete
completed: 2026-11-06
requirements: [PROF-01, PROF-02, LPT-01, LPT-02]
---

# 03-04 Summary: Web onboarding, games, strength profile

- **Onboarding:** five steps — attempt, hours (stepper with copy to weekdays, work and quiet hours), where you stand (15 subjects × New/Some/Strong), a short check (one question per screen, skippable), and how you learn. Today sends a user who hasn't onboarded to onboarding.
- **Learning Pattern Test (`/lpt`):**
  - The four games run in random order:
    - Map Pins: stylised SVG outline of India covering all of J&K and Ladakh, 20s study then tap to place.
    - Pattern Grid: 5×5, stops after 2 misses.
    - Listen & Recall: plays once; type it or say it (MediaRecorder → Chirp).
    - Read & Write Back: 60s read.
    - Arrange: a learning pass with years, then from memory.
  - An 8-minute pause after the first game, then the delayed round, then results (four bars plus one line).
- **Today** shows the learning-pattern card until the test is taken, then the strength profile, with a retake once it's due.
- **Verified in the browser** as a new user:
  - email sign-in → onboarding → profile saved → check skipped (no Prelims PYQs yet) → all 4 games → delayed round → results → Today.
  - Low confidence was correctly flagged when the tab was backgrounded.
- **Fixed during verification:**
  - dev CORS was missing PUT
  - map taps had no coordinates on web
  - place chips re-wrapped and shifted the map mid-game
- **Follow-ups:** a finer map outline (the northeast is coarse), and the river trace for the phone build.
