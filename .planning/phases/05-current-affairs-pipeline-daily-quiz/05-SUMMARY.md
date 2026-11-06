---
phase: 05-current-affairs-pipeline-daily-quiz
status: complete (cloud schedule created on next bootstrap run after deploy)
completed: 2026-11-06
requirements: [CA-01, CA-02, CA-03, CA-04, CA-05, CA-06]
---

# Phase 5 Summary: Current affairs pipeline and daily quiz

## Built
- **Database (0006):** `ca_items` (unique URL and normalised-title key), `ca_questions` (live or pulled), `ca_attempts`, `ca_reports`, `ca_shared`. Mistakes can now reference a CA question.
- **Pipeline** (`apps/api/src/services/ca.ts`):
  - Sources: the PIB RSS (Hindi; summarised in English and linked), RBI and SEBI RSS, and user-shared links.
  - Routine releases (auctions, recovery notices, orders, …) are dropped by rule, and items are deduplicated by URL and title key, with a cap of 30 a day.
  - Gemini assigns relevance, a UPSC-angle summary (≤80 words, guard-checked) and 1–3 GS nodes from the real node list.
  - Quiz: up to 10 MCQs in statement, how-many and match formats. A blind verifier solves each one and checks single answer, grounding and ambiguity; failures are dropped.
- **`@koach/ai` `mcq.ts`:** a shared verifier prompt and acceptance rule. The eval `ca-verifier.eval.ts` uses planted flaws and passes **7/7 live**, plus the mocked run in CI.
- **API:**
  - `/v1/ca/today`: items with linked nodes, and questions with answers withheld
  - `/v1/ca/answers`: wrong answers go to mistakes, a card and the task-done flag
  - `/v1/ca/questions/:id/report`: pulls the question for everyone
  - `/v1/ca/share`, `/v1/ca/node/:id` (90 days)
  - `/internal/ca-ingest`: scheduler secret required
- **Planner:** the CA task becomes current-capable once a quiz exists. The CA reminder fires only then.
- **App:** a CA screen (quiz, explanations, official-source links, Report, "In the news" with node links, share a link), and "Recently in the news" inside Learn sessions.
- **Infra:** Cloud Scheduler `koach-ca-ingest` at 05:30 IST via bootstrap.

## Verification
- 4 CA API tests (parse, routine and duplicate drops, verifier drops, answers to mistakes, report pulls) and 1 planner ordering test. 116 Vitest + 14 Jest pass.
- **Live local run:** 60 fetched → 20 routine dropped → 30 analysed → 15 visible → 10 verified questions (0 dropped). Checked in the browser.

## Notes
- PRS has no RSS; it's covered by shared links for now.
- The PIB English feed parameter returns Hindi; summaries are written in English and link the original.
