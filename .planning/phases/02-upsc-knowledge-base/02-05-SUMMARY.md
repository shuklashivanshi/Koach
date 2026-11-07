---
phase: 02-upsc-knowledge-base
plan: 05
subsystem: knowledge-base
tags: [strategy-kb, grounding, naming-guard, zod, vitest]
requires:
  - phase: 02-upsc-knowledge-base
    provides: KB tables, loader and naming guard (02-01)
provides:
  - 86 strategy claims (74 topper, 12 official), each with source url and source date
  - groundStrategyAnswer: cites claims or declines; client sees only counts or official source names
  - guard and grounding tests for the strategy KB
affects: [coach chat, daily plan reasoning]
status: complete
actuals:
  tokens: 11300
  tasks: 2
  commits: 2
plan_head_before: b659e941c82952f675c709eb13f82840caa333a4
plan_head_after: e5f6f7327a8918d923f464d2b1b61416fa4df9d7
tech-stack:
  added: []
  patterns: [cite-or-decline grounding, defence-in-depth naming guard on model output]
key-files:
  created: [packages/kb/test/strategy.test.ts]
  modified:
    - packages/kb/data/strategy/claims.json
    - packages/kb/src/seed.ts
    - packages/kb/src/strategy.ts
    - packages/kb/test/fixture/strategy/claims.json
    - apps/api/src/routes/v1/kb/index.ts
key-decisions:
  - "ClaimSeed.sourceDate is required; topper dates are the source articles' publication dates"
  - "A model answer that trips the naming guard is declined, not shown"
requirements-completed: [KB-05]
---

# Phase 2 Plan 05: Strategy KB seed and grounding Summary

The strategy KB (86 de-identified claims) was already seeded and wired to `GET /v1/kb/strategy` in commit 0b192a1. This plan closed the gaps against the must-haves: missing source dates, the `groundStrategyAnswer` name, a name-guard check on model output, and a guard test over the real data.

## Tasks

1. **Seed (task 1)**: no new research was needed (86 claims is in the 80-120 range). Backfilled `sourceDate` on all 74 topper claims from each source article's published time (19 URLs, 2018-12 to 2025-12), made `sourceDate` required in the seed schema, and updated the fixture. Commit 0e45029.
2. **Grounding + API (task 2)**: renamed `answerStrategy` to `groundStrategyAnswer` (route updated); it now also declines when the model's answer contains a blocked name. Added `packages/kb/test/strategy.test.ts`. Commit e5f6f73.

## Must-haves check

- 80-120 claims with topic, claim, kind, source_url, source_date: **met** (86; test asserts range, kinds, dates).
- `groundStrategyAnswer` cites at least one claim or declines; client sees only "N topper accounts" or an official source name: **met** (tests: cited answer, official-source answer, no-match, no/unknown citation, empty answer; response and prompt contain no URLs or site names). Existing API test covers the route.
- No person or site names in client-facing fields (guard test): **met** (`findHits` over topic, claim and officialSource; topper source hostnames and brand words absent).

## Deviations from Plan

- **[Rule 2 - Missing critical functionality]** Topper claims had no `sourceDate`, which the plan requires; backfilled and enforced in the schema.
- **[Rule 2]** Added a naming-guard decline on model output; the prompt alone does not guarantee a clean answer.
- The commit protocol halted once on the protected `main` branch; resolved when the user enabled `git.allow_default_branch_commits`.

## Not run live

No Vertex AI calls were made; grounding is tested with mocked AI only. Retrieval is keyword-based (embeddings later, as planned), so loosely worded questions can match claims and rely on the model to decline.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm test` green (root 28 files / 134 tests; mobile 14 tests).

## Known Stubs

None.

## Self-Check: PASSED

All listed files exist; commits 0e45029 and e5f6f73 are ancestors of HEAD.
