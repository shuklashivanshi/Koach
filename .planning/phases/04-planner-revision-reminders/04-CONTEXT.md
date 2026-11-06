# Phase 4: Planner, Revision & Reminders - Context

**Gathered:** 2026-11-06 (autonomous smart discuss; 1 grey area answered by the user)
**Status:** Ready for planning

<domain>
## Phase Boundary
This phase builds the core daily loop:
- the weekly plan and the time-boxed daily to-do
- PYQ-first Learn sessions with a goal line and a retrieval check
- FSRS revision and node mastery
- the mistakes notebook and the heatmap
- nightly rebalance and quick replan
- reminders

Requirements: SCHED-01..05, SRS-01..03, PED-01..04, NOTIF-01..02.

**Not in this phase:** the CA quiz content (Phase 5 — the planner reserves the CA slot and links to it); cues (Phase 6); topic likelihood (v1.1).
</domain>

<decisions>
## Implementation Decisions

- **D-01 (user): reminders are delivered by Web Push now.**
  - Standard Web Push, with VAPID keys stored as the `VAPID_PRIVATE_KEY` secret.
  - A service worker in the web build; subscriptions are kept per device.
  - The same scheduler later delivers FCM to the phone.
- **D-02: rules decide.** All planning is deterministic code in `packages/planner`; no AI is needed for a plan to exist.
- **D-03: FSRS** via the `ts-fsrs` library, target retention 0.9.
  - Cards are of two kinds: node revision units (one per studied node) and recall cards (retrieval-check items and mistakes).
- **D-04: mastery** per node is 0..1.
  - Starts from `subject_levels`.
  - Updated by review grades and MCQ/check accuracy (EWMA, α = 0.3).
  - Decays with FSRS retrievability: displayed mastery = mastery × R(t).
- **D-05: phases** (PB-SWITCH):
  - Foundation until 31 Jan 2027: Learn/Revise/CA/Practice = 50/20/15/15.
  - Prelims-intensive from 1 Feb to 23 May 2027: 15/40/15/30.
  - First-pass deadline: 15 Feb 2027.
  - Mains-only nodes are dropped from Learn in Prelims-intensive.
- **D-06: daily allocation.**
  1. Due reviews take the Revise share (overflowing into Learn if more is due).
  2. A CA slot.
  3. Practice is PYQs on studied nodes.
  4. Learn is filled greedily by priority × (1 − mastery) ÷ minutes, with prerequisites satisfied first and at most 2 subjects per day.
  - Priority = normalised PYQ frequency (Prelims-weighted in the Prelims phase) + section weightage.
  - Tasks are rounded to 5 minutes. Each Learn task names the source and chapter.
- **D-07: ≥3 revision touches before Prelims.** The weekly plan forecasts FSRS due dates; any studied node with fewer than 3 touches before 23 May gets extra revisions inserted (SRS-03). The plan exposes the forecast.
- **D-08: Learn session (PB-PYQ, PB-FOCUS).**
  - 2–3 PYQs on the node, then source and chapter, then a goal line ("Finish Ch 7 · Fundamental Rights + 3 PYQs"), then a retrieval check.
  - The check is 3–5 recall items from Gemini (bulk): question + answer from the node and source chapter.
  - A second pass verifies the items, and only verified items are kept. They're cached per node.
  - Self-graded (Got it / Missed). Missed items become FSRS cards.
- **D-09: mistakes notebook (PB-MISTAKE).**
  - Every wrong MCQ (PYQ practice, diagnostic, CA quiz later) is logged with a one-tap cause and becomes a card.
  - The monthly "recurring traps" view = cause × subject counts.
- **D-10: nightly rebalance** is a Cloud Run job, `koach-rebalance`, run by Cloud Scheduler at 02:30 IST.
  - Unfinished tasks are re-queued by priority and a "what moved and why" note is stored for Today.
  - Locally it runs on demand (`POST /v1/plan/rebalance`, dev only).
- **D-11: quick replan.** "I only have N minutes" keeps the highest-yield tasks (due reviews first) and moves the rest.
- **D-12: reminder types** are plan ready, due reviews, CA quiz and streak at risk.
  - Each has an on/off switch and a time; tone is calm, firm or cheerful (default calm).
  - Reminders are never sent in work or quiet hours.
  - A dispatcher job every 15 minutes sends whatever is due.
  - Titles are ≤30 characters, bodies ≤60, and they pass the naming guard.
</decisions>
