---
phase: 07-optional-discovery
plan: 01
subsystem: kb
tags: [optionals, data-integrity, slug-join, audit]
requires: []
provides:
  - resolveOptionalSlug and joinOptionalStats (canonical-slug join of annual-report rows to profiles)
  - real-data integrity and persona tests for optional data
  - optional-audit.ts soft-flag report
affects: [07-02, 07-03, 07-04, 07-05]
tech-stack:
  added: []
  patterns: [lenient loader plus strict data test]
key-files:
  created:
    - packages/kb/test/optional-data.test.ts
    - packages/kb/scripts/optional-audit.ts
  modified:
    - packages/kb/src/optionals.ts
    - packages/kb/src/load.ts
    - packages/kb/test/optionals.test.ts
decisions:
  - Profile slugs, syllabus files and node ids stay as generated (truncated); the join resolves the stats slug instead of renaming
  - Prefix rule only for profile slugs of 30+ chars and only when exactly one candidate (never guess)
  - readKb stays lenient on unresolved stats slugs; the data test makes them a hard failure
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
plan_head_before: 5c3244adedb03fb931b82ccacfd1c8529fe09da0
plan_head_after: 49780e7736a9bf38c1a954c09494370a8e17cc62
requirements: [OPT-01, OPT-02, OPT-05]
---

# Phase 7 Plan 01: Optional data trust Summary

Annual-report rows are now joined to optional profiles by canonical slug, so Political Science and International Relations carries its 6 official reports (8,927 appeared, 745 recommended, not a small sample) instead of "No official data"; the 48 profiles and D-03 weights are guarded by tests on the real data.

## What was built

- `resolveOptionalSlug(statSlug, profileSlugs)`: exact match wins; else the single profile slug of length >= 30 that prefixes the stats slug; else null (ambiguous or none).
- `joinOptionalStats(profiles, years)`: attaches each year's rows to the resolved profile, returns `{ optionals, unresolved }`. `readKb` now uses it (previously exact slug equality dropped the 40-char truncated `political-science-and-international-rela` profile's rows).
- `optional-data.test.ts` (real committed data): stats (6 upsc.gov.in reports, distinct years, integer pairs recommended <= appeared, >= 38 rows/year, every slug resolves), profiles (48, syllabus file and topic count match, values in range, GS overlap sections exist, naming guard on summary and books), D-03 weights lock, two personas, literature gating, scores finite in [0,1].
- `scripts/optional-audit.ts`: read-only report, always exits 0.

## Commits

- 9c8889c test(07-01): RED tests for canonical optional slug join
- 4f6da1b feat(07-01): join optional stats to profiles by canonical slug
- 49780e7 test(07-01): real-data integrity and persona tests plus optional audit script

## Findings for expert review (weights and profiles untouched)

Persona top 5 on the committed data (pooled success from the joined rows):

- A, engineering (mathematics, technology, physical sciences; data and theory; numericals and diagrams; 450 h): physics 0.926, civil-engineering 0.819, electrical-engineering 0.755, mechanical-engineering 0.754, chemistry 0.717. Surprising: geography, economics. Note: mathematics and statistics do NOT reach the top 5 for this persona (mathematics has 0% GS overlap and 550 h > 450 h); worth a look but the assertion (any plausible optional in top 5) passes.
- B, humanities (society, politics, history; debates and narratives; analytical; 350 h): sociology 0.937, political-science-and-international-rela 0.912, history 0.901, public-administration 0.829, philosophy 0.807. Surprising: law, economics.

Audit flags:

- GS overlap >= 95% (6): agriculture, botany, history, physics, political-science-and-international-rela, public-administration. Overlap counts a topic if it touches one GS section, so these are probably inflated; physics at 100% is the clearest suspect.
- Small sample, pooled appeared < 100 (11): literature-assamese, -bengali, -bodo, -dogri, -manipuri, -marathi, -nepali, -odia, -santhali, -sindhi, and statistics (27 appeared).
- No rows in any of the 6 reports (2): literature-kashmiri, literature-konkani (real, not a bug).

Data finding: 2016 lists `literature-sindhi` twice (5/1 and 1/0), apparently two script rows in the report. Pooling sums them correctly (6 appeared, 1 recommended), so the data test allows exactly that one repeat. Any consumer that lists per-year rows (explorer year breakdown) will see two 2016 entries for Sindhi; consider merging at display time in a later plan.

## Deviations from Plan

### Auto-fixed Issues

None needing a code fix. One assertion widened per the plan's rule:

**1. [Plan rule - assertion widened] No repeated slug per year**
- **Found during:** Task 2
- **Issue:** real data repeats literature-sindhi in 2016 (see above)
- **Fix:** allow that single known repeat in the test with a comment; data untouched
- **Commit:** 49780e7

Environment note: the worktree did not contain the untracked 07-0x-PLAN.md files; the plan was read from the main checkout path (read-only). `pnpm install --frozen-lockfile` was run; pnpm-lock.yaml unchanged.

## Verification

- `pnpm typecheck`, `pnpm lint` clean; root `vitest run` 32 files / 177 tests pass; mobile jest 14 pass (VITEST_MAX_WORKERS=2).
- Audit script exits 0 and prints the Political Science row.

## Known Stubs

None.

## Threat Flags

None. T-07-01 and T-07-02 mitigations are the hard checks in optional-data.test.ts.

## Self-Check: PASSED

Files and the three commits exist on branch worktree-agent-ae2170526e8570087.
