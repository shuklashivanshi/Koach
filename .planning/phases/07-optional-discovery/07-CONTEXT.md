# Phase 7: Optional Discovery - Context

**Gathered:** 2026-11-06 (autonomous; follows PROJECT.md 2.3 and research/OPTIONAL-SELECTION.md)

<decisions>
- **D-01: official data only (OPT-05).** Appeared/recommended counts come from Table 5 of the UPSC Annual Reports, read with Gemini from the official PDFs.
  - Reports with English links: 65th, 68th, 69th, 72nd, 73rd, 74th.
  - Output: `data/optionals/stats.json` (source URL per year).
  - Success is pooled across years with a Wilson 95% band; pooled appeared < 100 shows a small-sample warning.
- **D-02: optional profiles** (`data/optionals/profiles.json`), generated once per optional and reviewable like the other KB data. Each has:
  - backgrounds, interest tags (fixed vocabulary), reading and answer style (0..1), materials availability, estimated first-pass hours, standard books (titles only, naming guard)
  - GS/Essay overlap computed from the syllabus graph: each optional topic is mapped to the GS sections it overlaps; overlap % = share of topics with ≥1 overlap
- **D-03: fit score** (config, shown behind Why?) = 0.30 interest + 0.20 background + 0.15 GS/Essay overlap + 0.10 writing-style fit + 0.10 materials + 0.10 time feasibility + 0.05 scoring stability.
  - Top 5, each with a one-line reason built from its strongest components.
  - "Surprising fits": high total score with no background match.
  - Literature optionals need the language answered yes.
- **D-04: Decision Coach.** Gemini answers only from the explorer facts for the optionals discussed (stats, overlap, hours, syllabus topics) plus the user's quiz answers. It runs stress tests (hours, a 3-line answer to a real syllabus topic, a regret question), corrects myths with the official numbers, and always states the deadline and the days left.
- **D-05: decision (OPT-04).** The choice and reasons are saved to the learner profile. The optional's topics become Learn units in the planner (90 min each, Mains-only; paused in the Prelims-intensive phase) with a coverage outline. A deadline card is shown on Today until a choice is made, and a "decision" nudge is added when ≤14 days remain.
</decisions>
