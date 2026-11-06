---
phase: 03-onboarding-learning-pattern-test
plan: 01
status: complete
completed: 2026-11-06
requirements: [PROF-01, PROF-02]
---

# 03-01 Summary: Profile, levels, diagnostic

- **Tables:** `learner_profiles`, `subject_levels`, `diagnostic_attempts` and `lpt_results` (migration 0003). All are included in the export and cascade on delete.
- **Subjects:** 15 learner-facing subjects (`packages/kb/src/subjects.ts`), each covering one or more syllabus sections.
- **Routes:**
  - `/v1/subjects`
  - `GET/PUT /v1/profile`: hours are validated as `HH:MM-HH:MM`, and the self-ratings seed the levels.
  - `GET /v1/diagnostic`: 20 keyed Prelims GS-I PYQs from the last 10 years, allocated across subjects by the bank's own counts (largest remainder, at least 1 per subject), with no answers sent.
  - `POST /v1/diagnostic`: scored on the server; levels = 0.6 × accuracy + 0.4 × self-rating; skipping uses the self-ratings. Finishing or skipping completes onboarding.
- **Tests:** 4 API tests.
- **Note:** the diagnostic needs Prelims PYQs with answers, which arrive with 02-03 extraction (official keys, or two agreeing AI solves).
