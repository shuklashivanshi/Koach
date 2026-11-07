---
phase: 07-optional-discovery
plan: 02
subsystem: planner, api
tags: [optional, planner, learn, outline, fit]
requires: []
provides:
  - OPTIONAL_UNIT_MINUTES and optionalUnitPriority in @koach/planner
  - Learn sessions for optional units (GET/POST /v1/learn/:nodeId)
  - GET /v1/optionals/outline, GET /v1/optionals/fits
  - POST /v1/optionals/choice returns startsOn and pausedForPrelims
  - OptionalFit on explorer and compare
affects: [apps/mobile optional screens (consume new shapes), 07-01 (disjoint files)]
tech-stack:
  added: []
  patterns: [shared rank step for quiz and stored-answer ranking]
key-files:
  created:
    - apps/api/test/optional-plan.test.ts
  modified:
    - packages/planner/src/priority.ts
    - packages/planner/src/planner.test.ts
    - apps/api/src/services/study.ts
    - apps/api/src/services/learn.ts
    - apps/api/src/services/optionals.ts
    - apps/api/src/routes/v1/optionals.ts
    - packages/shared/src/optionals.ts
    - apps/api/test/optionals.test.ts
key-decisions:
  - "optionalUnitPriority base raised from 0.45 to 0.5 (OPTIONAL_PRIORITY_BASE), step 0.002 per unit unchanged"
  - "Optional units stay Mains-only, 90 min each; plannedHours shown beside the profile's first-pass hours, never conflated"
status: complete
commits: 3
plan_head_before: 5c3244adedb03fb931b82ccacfd1c8529fe09da0
plan_head_after: dc61322a8f74fbdc2710f0a528c6210111e2889b
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
requirements-completed: [OPT-01, OPT-02, OPT-04]
---

# Phase 7 Plan 02: Optional units in the plan, outline, choice result and personal fit Summary

Choosing an optional now works end to end: its first unit appears as a Learn task, opens as a Learn session (no 404), completes into a review titled with the unit name, and the API exposes a coverage outline, a startsOn/pausedForPrelims choice result and the learner's personal fit.

## Tasks

1. **Task 1 (tracer) - optional units end to end** (3e4e73d). `OPTIONAL_UNIT_MINUTES` (90) and `optionalUnitPriority(i)` exported from the planner and used by `plannerInputs`; the Revise title map now includes the chosen optional's units; `learnSession` opens `topic` nodes under `optional:` papers (estMinutes 90, no source, no PYQs, goal "Cover <title>", optional's name in the recall prompt). GS topics, optional sections and paper nodes still 404. Three planner tests (Prelims pause from 2027-02-01, unit order via prereq chain, 14-day pool share) plus an API test covering choose, plan, session, 404s, Learn result and next-day titled Revise task. Tracer verified end to end before expanding.
2. **Task 2 - outline and choice result** (dd43f4e). `GET /v1/optionals/outline` (404 before a choice): units in syllabus order with paper I/II, minutes, studied/todo, scheduledOn, plannedHours versus firstPassHours, studied count and paused flag. `POST /v1/optionals/choice` now returns the DecisionStatus fields plus `startsOn` (today if today's plan is not built, else tomorrow) and `pausedForPrelims`. Idempotent on repeat.
3. **Task 3 - personal fit and re-openable ranking** (dc61322). `OptionalFit` on `OptionalExplorer` (so compare inherits it): computed with `rankOptionals` on one profile against all stats, equal to the quiz ranking score; null before a quiz or for a literature optional without the language. `GET /v1/optionals/fits` re-opens the ranking from stored answers (404 before a quiz). `runQuiz` and `fitsFor` share one `rank` step. The coach path passes no uid and carries no fit.

## Decisions

- **Final optionalUnitPriority base: 0.5** (was 0.45). With 0.45, the realistic-pool simulation (40 GS candidates, priorities 0.25 to 0.9, 14 optional units, 14 foundation days at 180 min) scheduled only 1 optional unit, below the D-05 requirement of at least 2. I tried 0.5, 0.55, 0.6, 0.65 and 0.7; all pass, so the smallest 0.05 step (0.5) was kept. GS Learn minutes stay at or above the optional Learn minutes in that simulation.
- **account.ts needed no change.** The export already spreads the whole learner profile, so `optional`, `optionalReasons` and `optionalQuiz` are in the bundle; a test now locks this.

## Deviations from Plan

None - plan executed as written (the priority base adjustment is explicitly permitted by the plan).

## Verification

`pnpm typecheck`, `pnpm lint` and `pnpm test` (174 vitest + 14 jest) all pass. Lockfile unchanged, no packages added. `prettier --check` reports 5 pre-existing unformatted files in packages/kb (not touched here).

## Known Stubs

None.

## Threat Flags

None. All new endpoints key on `request.uid`; `learnSession` only opens topic nodes under `optional:` papers (T-07-03, T-07-04, T-07-05 mitigations tested).

## Notes for the orchestrator

- Mobile consumes `OptionalExplorer` and the choice response; both gained fields (`fit`, `startsOn`, `pausedForPrelims`) and typecheck of apps/mobile passes.
- STATE.md, ROADMAP.md and REQUIREMENTS.md intentionally not updated (orchestrator does this after the wave).

## Self-Check: PASSED

Files exist (priority.ts, optional-plan.test.ts, optionals service and route, shared schema); commits 3e4e73d, dd43f4e, dc61322 are on the branch.
