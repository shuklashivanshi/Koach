# Phase 2: UPSC Knowledge Base - Context

**Gathered:** 2026-11-06 (autonomous smart discuss; 4 grey areas answered by the user)
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the ground truth Koach reasons over:
- the syllabus graph
- tagged PYQs
- a source per node
- PYQ statistics
- the strategy KB
- pedagogy playbooks

These are stored in Postgres, served read-only by the API, editable through an admin review page, and protected by the naming guard.

Requirements: KB-01..KB-08.

**Not in this phase:** daily plans or the scheduler (Phase 4); any learner-facing study screens (Phases 3–4); current affairs (Phase 5); topic prediction (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Data sources (user decisions)
- **D-01: PYQs come from official upsc.gov.in PDFs.** Prelims GS-I 2011–2026 and Mains GS I–IV 2013–2026, plus the official Prelims answer keys.
  - A script downloads them by manifest into a gitignored `data/raw/`.
  - Gemini (`bulk` tier, PDF input) extracts structured JSON per paper, which is committed under `packages/kb/data/pyq/`.
  - Each paper is checked for a known count (Prelims 100; Mains GS 19–20) and gaps are flagged.
  - English text only.
- **D-02: graph granularity is ~600–900 GS nodes.** Each node is one study session of 30–90 minutes.
  - The nodes are generated from the official syllabus text (CSE notification) by Gemini, written as JSON seed files, and validated structurally (unique ids, acyclic prerequisites, minutes in range, every leaf under a paper).
  - The ~48 optional syllabi are at topic level only.
- **D-03: the reviewer is the user, through an admin page in the web app.**
  - The page is open only to emails on an `ADMIN_EMAILS` allowlist.
  - It shows a random sample of ~50 tags and source mappings to approve or correct.
  - Corrections persist with `reviewed_by`/`reviewed_at`; the audit accuracy is computed from the reviews.
- **D-04: the strategy KB is seeded now.** About 80–120 short claims are researched from public topper accounts and official sources.
  - Stored with `source_url`, `source_date`, `kind` (topper | official), and the topic.
  - Person and site names are never stored in client-facing fields.
  - The API only ever returns counts ("Based on N topper accounts") or official source names.

### Storage and API
- **D-05: new tables in `packages/db`** (Drizzle):
  - `syllabus_nodes`, `node_prereqs`
  - `pyqs`, `pyq_tags` (status suggested | approved | corrected)
  - `sources`, `node_sources` (status as above)
  - `strategy_claims`
  - `kb_reviews` (audit log)
- **D-06: seed data loading.** Seed JSON lives in `packages/kb` (the new package: schemas, seed data, loaders, stats). An idempotent `kb:load` upserts it.
  - The `koach-migrate` job runs migrations and then the KB load, so Cloud SQL stays in sync on every deploy.
  - The local API loads it into PGlite at startup.
- **D-07: read API**, behind auth:
  - `GET /v1/kb/nodes`, `/v1/kb/nodes/:id` (node + source + PYQs + stats)
  - `/v1/kb/stats` (subject weightage)
  - `/v1/kb/pyqs?node=`
- **D-08: admin API**: `/v1/admin/review/*` (sample, approve, correct, audit summary), behind auth plus the allowlist.
- **D-09: computed statistics.** Node PYQ frequency and subject weightage are computed in SQL from approved and suggested tags; Prelims and Mains are kept separate.

### Rules
- **D-10: naming guard.** `packages/guard` holds the blocked-names list and `checkText`/`scrubObject`.
  - A Fastify `onSend` hook checks every JSON response from client-facing routes. In dev and tests a hit fails loudly; in prod it is redacted and logged.
  - Eval tests prove that no blocked name passes.
- **D-11: no copyrighted text.**
  - Sources store title, author, chapter number and title, and a one-line reason only.
  - Books titled after an institute or platform get a neutral label (e.g. `Environment reference · Ch 5`).
  - PYQ text is official UPSC material and is stored.
- **D-12: playbooks (PB-*)** are typed config in `packages/kb/src/playbooks.ts`, covering the v1.0 set: PYQ, WHERE, MISTAKE, HEAT, FOCUS, SWITCH, CA-LINK. Each has its parameters and trigger rules.
  - A `user_notes` table accepts the user's class notes for later refinement.
- **D-13: AI tagging.** Gemini suggests node, question-type, source-type and directive tags.
  - It may only use node ids from the graph; the output is schema-validated and status is `suggested`.
  - Every call goes through `@koach/ai` with cost logging.

### Claude's Discretion
- Exact node ids (`gs2.polity.fr.art14-18` style), the JSON layout, prompt wording, and the admin page layout. The admin page follows UI_SPEC tokens, but its copy is utilitarian.

</decisions>

<canonical_refs>
## Canonical References
- `.planning/PROJECT.md`: Foundations (Syllabus Graph, PYQ Bank, Source Map, PYQ statistics, Strategy KB, Playbooks, naming guard) and Cross-Cutting Rules 2–4
- `.planning/REQUIREMENTS.md`: KB-01..KB-08
- `.planning/research/PEDAGOGY.md` (playbooks), `.planning/research/TOPIC-PREDICTION.md` (tag fields used later), `.planning/research/OPTIONAL-SELECTION.md` (optional list)
- `packages/ai/evals/blocked-names.ts`: the existing blocked list (moves to `packages/guard`)
- PYQ PDFs: https://www.upsc.gov.in/examinations/previous-question-papers and `/archives`

</canonical_refs>

<deferred>
## Deferred Ideas
- Hindi text for PYQs, and questions from optional papers
- Topper-account growth beyond the seed (ongoing)

</deferred>

---
*Phase: 02-upsc-knowledge-base · Context gathered: 2026-11-06*
