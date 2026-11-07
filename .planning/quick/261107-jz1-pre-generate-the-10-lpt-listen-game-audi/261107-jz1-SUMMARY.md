---
phase: quick-261107-jz1
plan: 01
subsystem: api
tags: [lpt, tts, audio, static-assets, docker]
requires: []
provides:
  - "Static pre-generated LPT listen clips served from apps/api/assets/lpt-audio with live-TTS fallback"
  - "pnpm --filter @koach/api gen:lpt-audio generator script"
affects: [apps/api, apps/mobile (no change needed)]
tech-stack:
  added: []
  patterns: ["manifest-validated static clip store; stale or missing clips fall back to live TTS"]
key-files:
  created:
    - apps/api/src/services/lpt-audio.ts
    - apps/api/scripts/gen-lpt-audio.ts
    - apps/api/test/lpt-audio.test.ts
    - apps/api/assets/lpt-audio/.gitkeep
  modified:
    - apps/api/src/deps.ts
    - apps/api/src/server.ts
    - apps/api/src/routes/v1/learner/lpt.ts
    - apps/api/test/lpt.test.ts
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/Dockerfile
    - .graphifyignore
decisions:
  - "Clip set is derived from forms.*.lists (6 clips today), not hardcoded to 10"
  - "Clips are served only through the authenticated route; no static file serving"
metrics:
  tasks: 3
status: complete
actuals:
  tasks: 3
  commits: 4
plan_head_before: cb1e9265976acf14f627d4610c863648834ced16
plan_head_after: 45701e6f90ab84be966e8bb9c87edf6903552930
---

# Phase quick-261107-jz1 Plan 01: Pre-generated LPT listen clips Summary

The Listen & Recall audio route now serves a pre-generated mp3 from `apps/api/assets/lpt-audio` with zero TTS calls when the manifest says the clip was made from the current list text, and falls back to live TTS otherwise. **The clips themselves are not generated yet**; until the user runs the generator, behaviour is identical to before.

## What was built

- `apps/api/src/services/lpt-audio.ts`: `listText`, `clipFile`, `LptAudioManifest`, `fileLptClips` (read side, memoised hits, never throws, rejects names outside `lpt-[AB]-<digit>.mp3`, serves only when manifest text equals current text and the file is non-empty), `plannedClips`, `generateLptAudio` (sequential, incremental, `--force`, manifest rewritten after each clip, refuses to write empty audio).
- `deps.lptClips?` (optional, so test helpers are unchanged), wired in `server.ts` via `new URL('../assets/lpt-audio/', import.meta.url)`; the route checks 404 first, then the clip, then the old `usersRepo.upsert` + `deps.ai.speak` path. Response contract `{ audioBase64 }` unchanged.
- `apps/api/scripts/gen-lpt-audio.ts` with `--dry-run` (lists clips, touches nothing) and `--force`; `gen:lpt-audio` package script; `scripts` added to the api tsconfig include.
- Dockerfile copies `/repo/apps/api/assets` to `/app/assets`; `.gitkeep` keeps the directory in git and the build context; `*.mp3` added to `.graphifyignore`.

## Commits

- 90f3bee: serve clips with fallback (Task 1, tracer)
- db4993a: failing generator tests (Task 2 RED)
- 254130e: generator + script (Task 2 GREEN)
- 45701e6: Dockerfile, .gitkeep, graphify ignore (Task 3)

## Deviations from Plan

**1. [Rule 1 - Wrong plan fact] Only 6 clips exist, not 10**
- **Found during:** Task 1 (a test for `B/3` returned 404)
- **Issue:** The plan states 5 lists per form (10 clips). `forms.A.lists` and `forms.B.lists` each have 3 lists (lengths 5, 7, 9). The route's param schema allows list 0..4, so indexes 3 and 4 already 404 today.
- **Fix:** `plannedClips()` derives the clips from `forms`, so it yields lpt-A-0..2 and lpt-B-0..2 (6 clips) and will grow automatically if lists are added. Tests assert against the banks rather than a literal 10; the "missing clip" route test uses `B/2`; the dry-run check greps `lpt-B-2.mp3` instead of `lpt-B-4.mp3`. The `LptClips` filename pattern (`lpt-[AB]-<digit>.mp3`) is unchanged and still covers any future list count up to 10.
- **Not changed:** the route param max (0..4) was left alone as out of scope; it is looser than the data but harmless (404).

**2. [Rule 3 - Blocking] Worktree started 35 commits behind main**
- The agent worktree was created from an old base (no LPT route, no plan file, no node_modules). Fast-forwarded the (empty) agent branch to `main` with `git merge --ff-only main` and ran `pnpm install --frozen-lockfile` (no new packages). No work was lost.

**3. STATE.md had no "Quick Tasks Completed" table**; added the section with the first row.

## Test results

- `lpt.test.ts` + `lpt-audio.test.ts`: 17/17 pass (4 original + 3 new route tests, 10 generator/store tests); written test-first (RED confirmed, 10/10 failing).
- Full `pnpm vitest run --project api`: 15 files, 71/71 pass. The 4 baseline failures the caller mentioned (cues x1, kb x3) did not occur in this worktree because it contains only committed code.
- `pnpm --filter @koach/api typecheck`, `pnpm exec eslint apps/api`, prettier on api src/test/scripts/package.json/tsconfig.json: clean.
- `tsx scripts/gen-lpt-audio.ts --dry-run`: prints the 6 clips, writes nothing (`apps/api/assets` is not created by it).
- `graphify update .` run (graphify-out/ is gitignored).

## User must do (clips are NOT generated yet)

1. `gcloud auth application-default login`
2. `gcloud auth application-default set-quota-project koach-dev-8cf0a5` (if ADC has no quota project)
3. `pnpm --filter @koach/api gen:lpt-audio` (add `--force` to redo all, `--dry-run` to list). Writes 6 mp3s + `manifest.json` into `apps/api/assets/lpt-audio/`; cost is a few cents.
4. Listen to a couple of clips, then commit `apps/api/assets/lpt-audio/*.mp3` and `manifest.json` so the Docker image ships them.

Re-run after changing the lists in `packages/lpt/src/banks.ts` or the voice in `packages/ai/src/models.config.ts`; stale clips are regenerated and are never served.

## Known Stubs

None.

## Threat Flags

None. The only new file read is `fileLptClips`, covered by T-jz1-01..03 (validated params, filename allow-pattern, manifest-text check, no static serving).

## Self-Check: PASSED

- Created files exist (lpt-audio.ts, gen-lpt-audio.ts, lpt-audio.test.ts, .gitkeep).
- Commits 90f3bee, db4993a, 254130e, 45701e6 are ancestors of HEAD.
