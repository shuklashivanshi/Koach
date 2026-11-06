---
phase: 02-upsc-knowledge-base
plan: 02
status: complete
completed: 2026-11-06
requirements: [KB-01]
---

# 02-02 Summary: Syllabus graph seed

## What was built
- `scripts/gen-syllabus.ts`:
  1. Pulls the official syllabus text and the optional subjects' topic lists out of the CSE 2026 notification PDF, using Gemini with PDF input and a JSON schema. The output, `data/official/`, is reference only.
  2. Splits each GS paper into sections, topics and nodes.
  3. Adds prerequisites in a second pass and drops any edge that would close a cycle.
- **Seed:** `data/syllabus/*.json` holds 825 GS study nodes (30–90 min each). Per paper: Prelims-only 95, CSAT 44, Essay 21, GS1 213, GS2 167, GS3 205, GS4 80.
  - Prelims-only nodes cover ancient and medieval history, general science and the current-events approach. Everything else is shared with the Mains GS papers and flagged `prelims`/`mains`.
- 48 optional subjects at topic level, with Paper I and II sections.
- `test/syllabus.test.ts` covers:
  - the paper set and the 600–900 node range
  - minutes are 30–90
  - every optional has topics
  - references resolve, prerequisites are acyclic, the naming rule holds, and every node reaches a paper root

## Deviations
- The Prelims-only file was widened to include ancient and medieval political history, which the Mains GS1 syllabus doesn't cover (it has art and culture only).
- Optional topic lists are as granular as the official syllabus headings: 4–81 topics per subject. Literatures are thinnest.
- Node titles are AI-generated from the official text. Reviewing them happens alongside tag review on the admin page.
