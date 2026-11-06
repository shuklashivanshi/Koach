---
phase: 02-upsc-knowledge-base
plan: 03-04
status: partial (data jobs still running at commit time)
completed: 2026-11-07
requirements: [KB-02, KB-03]
---

# 02-03/02-04 Summary: PYQ bank, tagging, source map

- **Manifest:** 64 official papers, identified with printed-title checks (Hindi or English) — Prelims GS-I 2014–2026 and Mains GS I–IV 2014–2026. Mains 2014 GS2 and Prelims 2011–2013 are not on upsc.gov.in.
- **Extraction:** 57 papers extracted so far. Prelims answers come from the official key where one exists. Otherwise Gemini solves each question twice; only answers both runs agree on are kept, marked `answerSource: model`, and disagreements are listed in `pyq-report.json`.
- **Source map:** done for all 825 GS nodes.
- **Not done yet:**
  - PYQ tagging (`scripts/tag-pyqs.ts`), which runs once extraction finishes.
  - The ≥90% tag audit, which you do on `/admin/review`.
- **Optional data (Phase 7):** profiles 13 of 48 and stats for 1 exam year so far; the generators are re-runnable and merge.
