---
phase: 07-optional-discovery
plan: 03
subsystem: api, shared, planner
tags: [optional, coach, stress-tests, nudge]
requires: [07-02]
provides:
  - CoachReply.deadline and resting, CoachQuestion.history (4 exchanges)
  - POST /v1/optionals/stress (hours, answer, regret)
  - StressRequest, StressReply, COACH_RESTING_LINE in @koach/shared
  - PRELIMS_INTENSIVE_FROM and MAINS_FROM exported from @koach/planner
  - overdue-aware decision nudge (no longer stops at the deadline)
affects: [apps/mobile optional screens (07-04), 07-05]
key-files:
  created:
    - apps/api/src/services/optional-stress.ts
    - apps/api/test/optional-stress.test.ts
    - apps/api/test/optional-nudge.test.ts
  modified:
    - apps/api/src/services/optionals.ts
    - apps/api/src/services/coach.ts
    - apps/api/src/routes/v1/optionals.ts
    - packages/shared/src/optionals.ts
    - packages/planner/src/phases.ts
    - apps/api/test/optionals.test.ts
key-decisions:
  - "Hours check shares: FOUNDATION_SHARE 0.30 (today to 1 Feb 2027) and POST_PRELIMS_SHARE 0.50 (24 May to 20 Aug 2027); shown to the learner in facts as planning assumptions"
  - "Verdict thresholds: ratio >= 1.2 comfortable, >= 0.85 tight, else short"
status: complete
commits: 3
plan_head_before: f1a421b1197989ca735fb2a499956097dd050339
plan_head_after: d863035b5871b64dca0434ad86c5fc83eaef44c7
actuals:
  tokens: 15000
  tasks: 3
  commits: 3
requirements-completed: [OPT-03, OPT-04]
---

# Phase 7 Plan 03: Decision Coach memory, stress tests and overdue nudge Summary

The Decision Coach now returns the deadline as data on every reply, remembers four exchanges and rests gracefully when the AI is down; the learner can run three stress tests through one endpoint; and the decision nudge keeps coming after the deadline with overdue wording.

## Tasks

1. **Coach reply** (e0fe8f3). `CoachQuestion.history` (up to 4 `{q<=500, a<=1200}`, default `[]`), `CoachReply.deadline` and `resting`. Prompt keeps the evidence, quiz answers and status line as context but no longer asks the model to mention the deadline (it tells it not to restate dates or day counts); earlier exchanges and the question are labelled as data. `ai.json` failure returns 200 with "The coach is resting. Your plan still works.", `stressTest: null`, `resting: true`, deadline still present.
2. **Stress tests** (5041b25). `optional-stress.ts` with `hoursCheck`, `regretQuestions`, `verdictFor`, `runStress`; route `POST /v1/optionals/stress`. Planner exports `PRELIMS_INTENSIVE_FROM` and new `MAINS_FROM` (20 Aug 2027 IST); `phaseFor` unchanged.
3. **Decision nudge** (d863035). Candidate fires for 14 or fewer days left including negative, while no optional is chosen; templates branch on soon, today and overdue; AI situation text describes overdue and last-day decisions; deadline arithmetic is the shared `optionalDeadline(deadline, now)` exported from `services/optionals.ts` (also used by `decisionStatus`). `TEMPLATES` is now exported from `coach.ts`.

## Shared schema shapes (additive; for 07-04 and 07-05)

```ts
// POST /v1/optionals/coach
CoachQuestion = { question: string(3..500), slugs: string[<=3], history?: {q: string<=500, a: string<=1200}[<=4] }   // history defaults []
CoachReply    = { answer: string, stressTest: string|null,
                  deadline: { date: 'YYYY-MM-DD', daysLeft: int, overdue: boolean } | null,   // null only if no profile row
                  resting: boolean }                                                          // true => answer is the resting line
COACH_RESTING_LINE = 'The coach is resting. Your plan still works.'                          // exported from @koach/shared

// POST /v1/optionals/stress   (200 StressReply, 404 { error: 'not_found' } for unknown slug or unit out of range, 400 on bad body)
StressRequest = { kind: 'hours',  slug }
              | { kind: 'regret', slug }
              | { kind: 'answer', slug, unit?: int>=0 (default 0), text?: string(10..600) }   // type is z.input, so unit is optional for callers
StressReply   = { kind: 'hours'|'answer'|'regret', title: string, body: string,
                  verdict: 'comfortable'|'tight'|'short'|null, facts: string[] }
```

Per kind:
- **hours**: title "Hours check"; body one sentence ("About N of the M hours you need are free before Mains. That is short."); `verdict` set, or null with one fact ("Set your weekly study hours first...") when weekly hours are all zero; `facts` = the numbers used, last fact states the shares are planning assumptions.
- **regret**: title "Regret check"; body "Answer these three honestly before you decide."; `verdict` null; **`facts` = the 3 fixed questions**.
- **answer** without `text`: **`title` = the real unit title**, body = prompt to write 3 lines, `facts` = `["Unit N of M"]`. With `text`: same title, `body` = model feedback (or the resting line if the model fails, or "I can’t give feedback on that answer." if the naming guard rejects it).
- The unit index addresses `OptionalExplorer.topics` (same order), so the app can step through units with `unit = 0..topics.length-1`.

## Reply and nudge copy added

Coach: resting line above. Nudge decision templates (title / body):
- calm: "Your optional" / "N days to decide. The coach can help." | "Today is the day to decide. Ask the coach." | "The date passed N days ago. Ask the coach."
- firm: "Choose your optional" / "N days left. Compare your top two today." | "Last day to choose. Compare your top two." | "The date passed N days ago. Choose one today."
- cheerful: "Optional check-in" / "N days to go. Let’s narrow it down." | "Decision day is here. Let’s narrow it down." | "The date passed N days ago. Let’s pick one."

All within 30/60 characters (tested across subjects 14 to -100), no exclamation marks, pass `checkText`.

## Deviations from Plan

**1. [Plan arithmetic] Weekly hours in the test week are 22.5, not 25.**
- **Found during:** Task 2
- **Issue:** The plan says the weekday minutes `[150,150,150,150,150,300,300]` are "25 hours a week", and the 350-hour example expects about 219 available hours (ratio 0.63). That week sums to 1350 minutes = 22.5 hours, which gives 197 hours (ratio 0.56). Both are verdict `short`.
- **Fix:** No code change; the implementation is correct. The unit test reproduces the plan's 219 / 0.63 numbers with a true 25-hour week (`[200,200,200,200,200,250,250]`) and a separate case locks the 22.5-hour week to 197. The API test uses the onboarding week and asserts verdict `short` and the 22.5-hour fact.
- **Files modified:** apps/api/test/optional-stress.test.ts

**2. [Rule 3 - Blocking] Worktree base was stale.** The worktree started at 5c3244a, before wave 1. Fast-forwarded it to `main` (f1a421b) with `git merge --ff-only main` (non-destructive) to get 07-01 and 07-02. `plan_head_before` is f1a421b.

Otherwise the plan was executed as written.

## Verification

`pnpm typecheck`, `pnpm lint` and `pnpm test` pass (217 vitest + 14 jest, `VITEST_MAX_WORKERS=2`). `prettier --check` clean on apps/api, packages/shared, packages/planner. Lockfile unchanged, no packages added. Mobile typecheck passes (its `askCoach` client parses the extended `CoachReply`; it sends no history, which defaults to `[]`).

## Notes for 07-04 and 07-05

- The mobile `askCoach(question, slugs)` in `apps/mobile/src/api/client.ts` was not changed (07-04 owns mobile). To use memory it should send `history` (last 4 `{q, a}`). To show the deadline use `reply.deadline`, and `reply.resting` to style the resting state.
- The deadline card on Today should stay visible while `DecisionStatus.chosen` is null even when `daysLeft < 0` (the API already returns negative `daysLeft`).

## Known Stubs

None.

## Threat Flags

None. `/v1/optionals/stress` sits under the authenticated scope, reads only the caller's own profile row, and learner text is length-capped by zod (T-07-06, T-07-08, T-07-09 mitigations tested: hours and regret make no AI call, answer test makes one call with data-labelled input, 401 without a bearer token).

## Self-Check: PASSED
