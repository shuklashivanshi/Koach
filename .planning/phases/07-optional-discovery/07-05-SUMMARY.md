---
phase: 07-optional-discovery
plan: 05
subsystem: mobile
tags: [optional, coach, stress-tests, choose, outline, today-card]
requires: [07-03, 07-04]
provides:
  - CoachSheet (bottom sheet, chips, 4-exchange memory, three stress tests, DECIDE BY overline)
  - ChooseSheet (reasons, confirmation, Added to your plan with the join day and Prelims pause line)
  - /optionals/outline coverage outline route
  - DecisionCard on Today (shown until a choice is made, with an overdue state)
  - Sheet UI primitive; api.stress, api.outline, history-aware api.askCoach
affects: [phase 7 UAT]
tech-stack:
  added: []
  patterns: [shared Sheet primitive over react-native Modal, locale-independent date helpers in src/optionals/format.ts]
key-files:
  created:
    - apps/mobile/src/optionals/CoachSheet.tsx
    - apps/mobile/src/optionals/ChooseSheet.tsx
    - apps/mobile/src/optionals/DecisionCard.tsx
    - apps/mobile/src/app/optionals/outline.tsx
    - apps/mobile/src/ui/Sheet.tsx
    - apps/mobile/__tests__/optionals-coach.test.tsx
    - apps/mobile/__tests__/optionals-choose.test.tsx
    - apps/mobile/__tests__/optionals-decision-card.test.tsx
  modified:
    - apps/mobile/src/api/client.ts
    - apps/mobile/src/optionals/format.ts
    - apps/mobile/src/app/optionals/index.tsx
    - apps/mobile/src/app/optionals/[slug].tsx
    - apps/mobile/src/app/optionals/compare.tsx
    - apps/mobile/src/app/(tabs)/today.tsx
    - apps/mobile/src/app/_layout.tsx
    - apps/mobile/__tests__/optionals-screens.test.tsx
    - apps/mobile/jest.setup.ts
  deleted:
    - apps/mobile/src/app/optionals/coach.tsx
key-decisions:
  - "Sheet is one shared primitive (scrim + cream sheet with sheet radius, scrolls, scrim tap closes) used by both coach and choose"
  - "Stress-test results are appended to the coach history (q 'Stress test: <title>'), so the coach can discuss them; resting replies are not added to history"
  - "Answer test picks a random unit index within the optional's topic count; the real unit title comes back from the API"
status: complete
commits: 3
plan_head_before: 0de156292aabe8e3ece127e4ba5c00ee2f32b244
plan_head_after: accc0b1585eccdc4722caa46eb3cf0c1a794fdc9
actuals:
  tokens: 28000
  tasks: 3
  commits: 3
requirements-completed: [OPT-03, OPT-04]
---

# Phase 7 Plan 05: Coach sheet, choose flow, outline and Today deadline card Summary

The Decision Coach is now a bottom sheet with chips, a deadline overline, short memory and three runnable stress tests; choosing is reasons, confirm, then "Added to your plan." with exactly when it joins; the chosen optional has a coverage outline; and the Today deadline card stays until a choice is made, including after the date.

## Tasks

1. **Coach sheet** (eabdad3). `CoachSheet` on a new shared `Sheet`. Overline from `api.decision()` (`DECIDE BY 15 DEC`, or `PAST 15 DEC · N DAYS` once overdue) and refreshed from each reply's `deadline`. Three chips fill a full sentence. Each exchange is a PaperCard (question muted, answer, `Try this:` when the reply has a stress test; resting answers are muted). The last 4 exchanges are sent as `history` (q cut to 500, a to 1200). Stress row (Hours check, 3-line answer, Regret check) works on the selected optional (name chips when more than one, max three); verdict shown in words in ink, facts behind Why?; the answer test first fetches the real unit title and prompt, then a Field and Get feedback. Client: `askCoach(question, slugs, history)`, `stress(request)`, `outline()` (404 to null), `chooseOptional` parsed as `OptionalChoiceResult`. `formatDay` and related helpers added to `format.ts`. Home, explorer and compare open the sheet; `app/optionals/coach.tsx` and its `_layout` entry are removed.
2. **Choose flow and outline** (8233ae0). `ChooseSheet` (reasons with a 3-character gate, confirm that names the optional it replaces, success with the join day from `startsOn` against local today and the Prelims pause line, See the outline). Explorer: Decide block replaced by `Make it my optional` (or `Your optional` + `See the outline` once chosen). `outline.tsx`: Stat row, 90-minute caption with planned and first-pass hours, pause notice, units by Paper I and II with a sage Check or empty circle plus words, tap opens `/learn/<nodeId>`, skeletons, error with Try again, and the no-optional state.
3. **Today card and home** (accc0b1). `DecisionCard` replaces the inline Today card (`daysLeft >= 0` guard removed, so it persists after the date); renders nothing once chosen. Home shows `Your optional: <name>` with `See the outline`.

## Exact copy used

- **Deadline card (Today):** overline `DECIDE BY 15 DEC` (always the date, upper case); title `Choose your optional`; caption `12 days left` / `1 day left` / `Decide today` / `3 days past your date` / `1 day past your date`; secondary button `Open`.
- **Coach overline:** `DECIDE BY 15 DEC`; overdue `PAST 15 DEC · 3 DAYS` (`1 DAY`). Chips: `I'm an engineer…`, `Is it too long?`, `Is it scoring?`.
- **Choose, step 1:** heading `Your reasons`, line `Why <name>? A line or two, in your words. You can change it later.`, primary `Make it my optional`.
- **Choose, step 2:** heading `Choose <name>?`, `This replaces <old name>.` (only when changing), `Its units join your plan as 90-minute Learn tasks.`, primary `Confirm`, secondary `Keep looking`.
- **Choose, success:** heading `Added to your plan.`, `It joins your plan from today.` / `from tomorrow.` (otherwise `from Mon 9 Nov`), `Optional study resumes after Prelims.` when paused, primary `See the outline`.
- **Failures:** `Couldn't reach the library. Try again.`

## Deviations from Plan

**1. [Rule 3 - Blocking] Global `expo-audio` mock in `apps/mobile/jest.setup.ts`.** CoachSheet and ChooseSheet reuse the shared `Field` from `@/lpt/games`, which imports `expo-audio` and crashes in jest; that broke the existing compare and screens suites as well. A one-line global mock (tests that exercise audio still mock it themselves) was simpler than mocking it in every suite. File is not in the plan's list.

**2. [Rule 3] `optionals-screens.test.tsx` updated.** The explorer now calls `api.decision()`; the suite's mock returned undefined. Default mock added in `beforeEach`, plus two tests for the Make it my optional / See the outline states.

**3. [Rule 3] New `Sheet` primitive (`src/ui/Sheet.tsx`).** Two sheets share one scrim and cream surface instead of copying the Delete account modal twice.

**4. `_layout.tsx` edited** to drop the `optionals/coach` screen and register `optionals/outline` (the plan's grep step: the layout was the only extra reference).

**5. TDD (Task 2).** Tests were written first and confirmed failing (missing modules), but the red and green steps are in one commit because the red state would not typecheck.

Task 1 also includes the `chooseOptional` and `outline()` client changes (they sit in the same `client.ts` edit) rather than splitting them into Task 2.

## Verification

- `pnpm typecheck` passes; `pnpm lint` passes; `VITEST_MAX_WORKERS=2 pnpm test` passes (217 vitest, 71 mobile jest across 11 suites).
- `prettier --check apps/mobile`: clean except `apps/mobile/public/sw.js` and `apps/mobile/src/app/(tabs)/_layout.tsx` (both pre-existing, untouched). Root `pnpm format` also flags `packages/kb/data/*.json` and `packages/kb/scripts/extract-pyqs.ts` (pre-existing, not touched).
- `expo export --platform web` bundles successfully with the new screens.
- Lockfile unchanged, no packages added.
- **Local API, curl, dev identity `dev:uat07` (real Vertex responded):** `POST /v1/optionals/stress` for regret, hours and answer (without text: real unit title and prompt; with text: feedback); `POST /v1/optionals/coach` with `history: []` (answer, stressTest, deadline all present); `POST /v1/optionals/choice` (returned `startsOn: 2026-11-08`, `pausedForPrelims: false`); `GET /v1/optionals/outline` (9 units, paper I/II, 90 min each, plannedHours 13.5, firstPassHours 400); `GET /v1/optionals/status`. All shapes match the schemas the client parses.

## Not verified in a browser

There is no browser tool in this environment, so the plan's end-of-phase human-check (390px and 1024px, Lamplight, the full journey) was **not** run. Specifically not verified visually or interactively: the Today deadline card appearance; quiz, explore, compare table at 390px; coach sheet layout (scrim, scroll with keyboard, chips wrapping, the stress row and Why? toggle) in a real browser; the confirmation flow end to end in the UI; outline layout; Lamplight contrast; 1024px layout. Also not exercised: step 6 (opening the optional's Learn task from the next day's plan and seeing the review with the unit's name). That was covered at API level by 07-02's test, and the outline's tap target only pushes `/learn/<nodeId>`, which jest covers. The 07-04 human-checks are still outstanding too. Both should be harvested into the phase UAT.

Also untested: Android keyboard behaviour inside the `Modal`-based sheet (the field sits in a ScrollView with `keyboardShouldPersistTaps`).

## Known Stubs

None.

## Threat Flags

None. Model text is rendered as plain React Native `Text`; history is truncated client-side before send; reasons and 3-line answers go only to existing authenticated endpoints; no packages added (T-07-12, T-07-13, T-07-SC).

## Self-Check: PASSED

Files verified present: CoachSheet.tsx, ChooseSheet.tsx, DecisionCard.tsx, outline.tsx, Sheet.tsx, three new test files; `coach.tsx` absent. Commits eabdad3, 8233ae0, accc0b1 are ancestors of HEAD.
