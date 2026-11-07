---
phase: 07-optional-discovery
plan: 04
subsystem: mobile
tags: [optional, quiz, explorer, compare, ui]
requires: [07-01, 07-02]
provides:
  - Stepwise Fit Quiz with fit-dot results, Why? weights and a re-openable ranking
  - Explorer with Stat row, official band chart, personal fit and estimated answer-style bars
  - Side-by-side compare table with the best value per row marked
  - Skeleton and error states on every optionals screen
affects: [07-05 (coach sheet and Decide block replace the explorer parts left as is)]
tech-stack:
  added: []
  patterns: [pure format helpers in src/optionals, presentational primitives in src/ui, core-view charts]
key-files:
  created:
    - apps/mobile/src/optionals/format.ts
    - apps/mobile/src/ui/Stat.tsx
    - apps/mobile/src/ui/MasteryDots.tsx
    - apps/mobile/src/ui/ProgressThread.tsx
    - apps/mobile/src/ui/BandChart.tsx
    - apps/mobile/src/ui/Skeleton.tsx
    - apps/mobile/src/ui/LoadError.tsx
    - apps/mobile/__tests__/optionals-format.test.ts
    - apps/mobile/__tests__/optionals-quiz.test.tsx
    - apps/mobile/__tests__/optionals-compare.test.tsx
    - apps/mobile/__tests__/optionals-screens.test.tsx
  modified:
    - apps/mobile/src/api/client.ts
    - apps/mobile/src/app/optionals/quiz.tsx
    - apps/mobile/src/app/optionals/[slug].tsx
    - apps/mobile/src/app/optionals/compare.tsx
    - apps/mobile/src/app/optionals/index.tsx
key-decisions:
  - "Appeared is a compare row but has no best mark (more candidates is not better); bestPerRow covers six rows"
  - "Success is crowned only among at least two non-small samples with a rate; a sole eligible item is not crowned"
  - "Explorer shows fit component scores only (the explorer response has no weights); weights live behind Why? on the quiz results"
status: complete
commits: 3
plan_head_before: f1a421b1197989ca735fb2a499956097dd050339
plan_head_after: da1af25885724ed789d110ee985a82bfdec91b35
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
requirements-completed: [OPT-01, OPT-02, OPT-05]
---

# Phase 7 Plan 04: Fit Quiz, results, explorer and compare screens Summary

The optional discovery screens now follow UI_SPEC 10.11: a one-question-per-screen quiz that ends in five fit-dot rows with Why? weights, an explorer with the Stat row, official band chart and the learner's own fit, and compare as a real side-by-side table with the best value per row marked.

## Tasks

1. **Pure helpers and primitives** (37ab1a0). `pct`, `fitDots`, `componentLabel`, `bestPerRow` (tested for ties, all-equal rows, small samples and missing fit) and `Stat`, `MasteryDots`, `ProgressThread`, `BandChart`. BandChart is drawn with core views only: a track per year, a leather dot at the yearly rate, a translucent plaid band for the pooled Wilson interval, per-row text (`2022: 143 of 1,836 (7.8%)`), a `Pooled 8.1% (7.6%-8.6%)` caption and `Few candidates` for small samples.
2. **Fit Quiz** (e006ece). Seven steps (degree, enjoy, read, answer, hours, language, risk) with ProgressThread, Back and one Next (`See my fits` last); degree has no default and interests need one pick. Results are five rows with name, MasteryDots and reason, a Why? that lists `What you enjoy 80 × 30%` from the API weights, a Surprising fits section, a primary `Compare the top three` and a text `Retake`. `?view=results` re-opens the ranking via the new `api.fits()` (404 falls back to question one). A failed submit shows the error copy and keeps the answers.
3. **Explorer, compare, home** (da1af25). Explorer: three Stats, band chart with a source caption, your fit with Why? (or a `Take the fit quiz` text button), four answer-style bars captioned `Estimated from the syllabus, not from past papers`, Read, syllabus list, `Compare` (secondary, opens home with the slug preselected) and `Ask the coach about this` (text). The Decide block is unchanged for 07-05. Compare: 2 to 3 equal columns, seven factor rows, sage Check icon plus `best-<row>-<slug>` testID, `few candidates` caption. Home: skeleton rows, error with Try again, `Your fits` text button when a quiz was taken, `?compare=` preselect, `No candidates in the years read`.

## Deviations from Plan

### Auto-added

**1. [Rule 2 - missing critical functionality] Shared Skeleton and LoadError components**
- **Why:** the plan requires skeleton rows and the error copy with Try again on four screens; one small component each avoids four copies.
- **Files:** apps/mobile/src/ui/Skeleton.tsx, apps/mobile/src/ui/LoadError.tsx.

**2. [Rule 2] Extra screen test file**
- apps/mobile/__tests__/optionals-screens.test.tsx covers the explorer (Stat row, chart, fit, small-sample, no rows, error) and the home states, which the plan's listed tests did not cover.

**3. [Rule 3 - blocking] Worktree base was behind main**
- The worktree branch started at 5c3244a, before 07-01/07-02. I fast-forwarded it to main (f1a421b) with `git merge --ff-only main` before starting; no commits were rewritten.

**4. Test setup**
- Quiz and screens tests mock `@/app/onboarding` (a Chip shim) and `expo-audio`, because importing the onboarding route pulls reanimated/worklets, which do not load in jest.

## Verification

- `pnpm typecheck`, `pnpm lint` pass. Mobile is excluded from ESLint by config (`apps/mobile/**` is ignored), so mobile is covered by tsc and prettier; `prettier --check` is clean on every file touched (the one warning, `src/app/(tabs)/_layout.tsx`, is pre-existing and untouched).
- Mobile jest: optionals suites (format 8, quiz 7, compare 5, screens 6) plus client tests pass.
- `expo export --platform web` bundles successfully with the new screens.
- Lockfile unchanged, no packages added.

## Not browser-verified

The plan's human-check (390px and 1024px, Lamplight, real data) was not done: there is no browser tool in this environment and the dev API needs live GCP credentials (Firebase sign-in, Vertex, dev database). Layout, spacing, horizontal overflow of the compare table at 390px, BandChart alignment of the left text column against the right track column (text rows are fixed at one line, so a very long label could misalign), and Lamplight contrast are unverified visually. Harvest at end of phase with 07-05.

## Known Stubs

None. (Answer-style bars are an estimate by design and say so on screen.)

## Threat Flags

None. Screens render only schema-parsed data; slugs go through the existing URL-encoding client methods; no packages added (T-07-11, T-07-SC).

## Self-Check: PASSED
