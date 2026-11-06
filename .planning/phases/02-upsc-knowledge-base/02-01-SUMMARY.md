---
phase: 02-upsc-knowledge-base
plan: 01
status: complete
completed: 2026-11-06
requirements: [KB-04, KB-06, KB-08]
---

# 02-01 Summary: KB schema, packages, read API, naming guard

## What was built
- **`packages/guard`:**
  - A blocked-names list covering educators, institutes, apps, platforms and channels.
  - `checkText`, `findHits` and `scrub`, which match whole words after normalisation. Ordinary words ("vision", "insight"), official bodies (the national academy of administration) and book authors are not flagged.
- **Database:** migration `0002_kb_tables` adds `syllabus_nodes`, `node_prereqs`, `pyqs`, `pyq_tags`, `sources`, `node_sources`, `strategy_claims`, `kb_reviews` and `user_notes`.
- **`packages/kb`:**
  - Zod seed schemas.
  - `readKb` and `validateKb`, which check references, prerequisite cycles and blocked names in client-facing text.
  - An idempotent `loadKb` that never overwrites approved or corrected rows.
  - `nodeFrequencies` (rolled up to ancestors), `subjectWeightage`, `getNode` (source label is neutral when one is set) and `pyqsForNode`.
  - The v1.0 playbooks as typed config.
- **API:**
  - `GET /v1/kb/nodes`, `/v1/kb/nodes/:id`, `/v1/kb/stats` and `/v1/kb/pyqs?node=`, all behind auth.
  - An `onSend` naming-guard hook on every JSON response: it fails with a 500 in dev and test, and redacts and logs in prod.
- **Loading the knowledge base:**
  - `koach-migrate` loads the KB from `/app/kb-data` after migrations.
  - The local API loads `packages/kb/data` into PGlite.
- **DPDP:** the data export now includes the user's class notes, and deletion cascades to them.

## Verification
- 70 Vitest + 14 Jest tests pass. New tests:
  - guard: 3
  - kb (loader, validation, stats, review protection, playbooks): 6
  - KB API and guard hook: 5
- Typecheck and lint are clean. The local API starts and loads an empty KB.
