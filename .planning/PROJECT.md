# Koach

## What This Is

Koach is a mobile-first (React Native + TypeScript) AI coach for the UPSC Civil Services Exam. It decides what to study, revise and practise each day and where to read it from, connects current affairs to the static syllabus, and turns material into memory cues (repetition, memory palace, mnemonics, first-principles explanations) tuned to how the individual learner actually retains information. It is built first for Shivanshi's own CSE 2027 attempt (working, 3–5 hrs/day) and designed multi-user so it can later serve UPSC aspirants broadly.

## Core Value

Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data (official syllabus, PYQs, cited topper strategy). If everything else fails, the daily plan + spaced-revision engine must work.

## Business Context

- **Customer**: v1 = Shivanshi (dogfood); later = UPSC CSE aspirants, especially working aspirants with limited hours
- **Revenue model**: None in v1; subscription considered for public launch after Prelims 2027
- **Success metric**: Shivanshi completes ≥85% of planned weekly hours and every Prelims syllabus node gets ≥3 revisions before 23 May 2027
- **Strategy notes**: See `docs/PRODUCT_SPEC.md`

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Syllabus graph (official UPSC syllabus → atomic nodes) with PYQ frequency, prerequisites and a recommended source + chapter per node
- [ ] PYQ bank (Prelims GS-I 2011–2026, Mains GS 2013–2026) tagged to syllabus nodes
- [ ] Cited strategy knowledge base; AI strategy answers must cite it
- [ ] Onboarding that captures exam target, weekday availability, subject self-assessment and a short diagnostic
- [ ] Memory Style Test: controlled recall experiment across repetition / first-principles / memory palace / mnemonics at 0h, 24h, 72h → cue-efficacy vector, updated continuously from real reviews
- [ ] Scheduler: weekly plan + time-boxed daily to-do from priority, mastery, SRS load, phase and availability; nightly rebalance; quick "I only have N minutes" replan
- [ ] FSRS spaced repetition for cards and node-level revision units; node mastery model
- [ ] Reminders: push notifications with quiet hours for plan, due reviews, CA quiz, streak risk
- [ ] Daily current-affairs pipeline (PIB, PRS, government sources, user-shared links) → syllabus mapping → verified UPSC-style MCQs with sources
- [ ] Memory cue generation (repetition cards/cloze, memory palace placements, verified mnemonics, first-principles explanations with teach-back) weighted by the learner's efficacy vector
- [ ] Personalised nudges: rule-gated timing, LLM-written copy, weekly coach note
- [ ] Elective Discovery Agent: interview + UPSC optional success-rate data + syllabus overlap + taster PYQ test → ranked shortlist with evidence
- [ ] Topic prediction: transparent priority score (PYQ frequency, recurrence, CA salience) tuned and reported by backtest
- [ ] Evaluation and reports: Prelims mock analytics, weekly reports, readiness score; Mains answer evaluation from handwritten photo (v1.2)
- [ ] GCP deployment: Cloud Run API + jobs, Cloud SQL Postgres + pgvector, Vertex AI for all AI, Cloud Build via `deploy.yaml`

### Out of Scope

- Hosting copyrighted book or newspaper text — legal risk; Koach links and summarises, references books by title + chapter
- Live classes / video lectures — not the core value; aspirants already have content, they lack direction and retention
- Social feed / community chat — distraction during an attempt year; revisit for public launch
- Payments / subscriptions — no monetisation until after dogfooding through Prelims 2027
- Hindi and other mediums — v2, after English flows are validated
- Web app — mobile first; any admin tooling stays internal
- Non-Vertex AI providers — constraint: all AI features run on GCP Vertex AI

## Context

- **Exam calendar (UPSC Calendar 2027, released 20 May 2026):** CSE notification 13 Jan 2027; **Prelims 23 May 2027**; Mains from 20 Aug 2027. ~199 days to Prelims from project start (5 Nov 2026).
- **Learner (dogfood user):** Shivanshi — working, 3–5 study hrs/day, static syllabus partly covered, no structured revision or answer writing yet, optional subject **not decided** (must decide by ~15 Dec 2026). Self-reports that repetition and first-principles explanations help her remember; Koach should verify this by measurement rather than assume it.
- **Prep phases the product encodes:** Nov–Jan integrated GS + optional decision → Feb–May Prelims-intensive (revision cycles, PYQs, mocks) → late May–Aug Mains mode.
- **Evidence posture:** "learning styles" as fixed types lack strong research support. Retention is measured per cue type rather than assigned. FSRS outperforms SM-2 on public review datasets. PYQ subject-weightage numbers from coaching sites disagree, so Koach computes its own from the official papers.
- **Content sources:** PIB, PRS Legislative Research, ministry/RBI releases, UPSC annual reports (optional success rates), official question papers. Newspapers are linked and summarised, never republished.
- **Tooling:** Planned and executed with GSD Core (open-gsd/gsd-core 1.20.0, installed globally) in YOLO mode.

## Constraints

- **Tech stack**: React Native (Expo) + TypeScript for mobile; TypeScript (Node 22, Fastify) backend — user requirement, one language end to end
- **Cloud**: Deploy on GCP (Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Scheduler, Secret Manager, Artifact Registry, Cloud Build); region `asia-south1` — user requirement + India data residency
- **AI**: All AI features use Vertex AI (Gemini Flash/Pro, Gemini embeddings, grounding; Imagen optional) — user requirement
- **Deploy**: `deploy.yaml` (Cloud Build) is the deploy entrypoint — user requirement
- **Timeline**: v1.0 usable on Shivanshi's phone by ~3 Dec 2026; the product must not delay her own preparation for Prelims 23 May 2027
- **Budget**: Scale-to-zero infrastructure; Vertex spend target < ~US$2 per active user per month
- **Privacy**: DPDP Act 2023 aligned (consent, export/delete, minimal PII, India region)
- **Trust**: Every factual AI output carries sources; generated MCQs pass a verifier before being shown
- **GCP**: No project exists yet; Phase 1 includes project/API/IAM bootstrap
- **Design**: Minimal, low-text UI in a Light Academia theme (cream/beige/light brown, serif type, sunlight, engravings); light mode default, optional "Lamplight" dark mode. `docs/UI_SPEC.md` is the app-wide design contract that every per-phase UI spec inherits from

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build multi-user from day one, dogfood on Shivanshi first | Avoids a rewrite for public launch; keeps v1 tuned to a real learner | — Pending |
| Target CSE 2027 (Prelims 23 May 2027) | User's attempt; drives Prelims-first prioritisation | — Pending |
| Expo (managed) React Native | Fastest TS path to iOS + Android, managed push, OTA updates | — Pending |
| Cloud SQL Postgres + pgvector over Firestore | Relational planning/analytics/graph queries; avoids separate vector DB | — Pending |
| Fastify API + Cloud Run Jobs for pipelines | Scale-to-zero, containers for API and batch alike | — Pending |
| FSRS for spaced repetition | Better-evidenced than SM-2; per-user parameter fitting later | — Pending |
| Deterministic scheduler + topic scoring; LLM only for language/content | Explainable, testable, never blocked by an AI outage | — Pending |
| Memory style measured by recall experiment, not questionnaire | Learning-styles evidence is weak; measured retention is actionable | — Pending |
| Topic prediction validated by backtest (train ≤2021, test 2022–2026) | Claims must be data-backed, not guesswork | — Pending |
| Elective Discovery Agent in v1.0 | Optional must be decided by mid-Dec 2026 for a CSE 2027 attempt | — Pending |
| Link + summarise news; books referenced by title/chapter | Copyright safety | — Pending |
| Region asia-south1 | Latency for Indian users + DPDP data residency | — Pending |
| Light Academia design system: Cormorant Garamond + Literata, Phosphor Light icons, 4 tabs (Today / Revise / Library / You) | User's aesthetic; calm and scholarly; one primary action per screen keeps the UI from overwhelming | — Pending |
| GSD in YOLO mode | User preference; fast iteration toward a 4-week MVP | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-05 after initialization*
