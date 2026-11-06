# Phase 5: Current Affairs Pipeline & Daily Quiz - Context

**Gathered:** 2026-11-06 (autonomous; no user-level grey areas, decisions follow PROJECT.md 2.1)

<decisions>
- **D-01: sources.** Official feeds checked live 2026-11-06:
  - PIB releases RSS (`pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3`; the feed is in Hindi, summaries are written in English and link the original)
  - RBI press releases RSS
  - SEBI RSS
  - user-shared links
  - PRS has no RSS feed; it's covered by user-shared links until a scraper is justified.
  - Newspapers are never fetched or republished.
- **D-02: daily job.** Cloud Scheduler calls `POST /internal/ca-ingest` at 05:30 IST, with the same secret header as reminders.
  - Steps: fetch feeds, then drop routine items by rule (auctions, recovery notices, tenders, etc.), then deduplicate by URL and by a normalised title key, then cap at 30 new items.
  - Gemini (bulk) gives each item a UPSC relevance score (0..1), a UPSC-angle summary (≤80 words, English) and 1–3 syllabus nodes from the GS node list.
  - Items with relevance < 0.5 are stored but hidden.
- **D-03: quiz.** 5–10 MCQs a day from the top items. Formats: statement-based, "how many of the above", match-the-pair. Each has an explanation and its source item.
- **D-04: verifier.** A second Gemini pass solves each MCQ blind, without the key.
  - An MCQ is kept only if the blind answer matches the key and the verifier marks it single-answer, grounded in the item's own text, and unambiguous.
  - Failures are dropped and counted in the job report.
  - Eval: `packages/ai/evals/ca-verifier.eval.ts` with planted flawed MCQs (mocked in CI, live with `EVAL_LIVE=1`).
- **D-05: feedback.**
  - Wrong answers go to the mistakes notebook (cause tap), the SRS and the node's mastery.
  - A report pulls the question for everyone immediately (status `pulled`) and logs the reason.
- **D-06: links.** `GET /v1/ca/node/:id` returns the node's recent CA (PB-CA-LINK, 90 days); every CA item lists its nodes.
- **D-07: planner.** The CA task becomes current-capable once today's quiz exists (`caAvailable`), and the CA reminder fires only then.
</decisions>
