# Requirements: Koach

**Defined:** 2026-11-05
**Core Value:** Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data.

## v1 Requirements

Committed scope for milestone **v1.0 Daily Coach MVP** (target ~3 Dec 2026). Each maps to a roadmap phase.

### Platform & Infrastructure

- [ ] **PLAT-01**: GCP projects (`koach-dev`, `koach-prod`) are bootstrapped by a script: required APIs enabled, least-privilege service accounts, Artifact Registry, Secret Manager, budget alert
- [ ] **PLAT-02**: `deploy.yaml` (Cloud Build) lints, tests, builds and pushes the API and jobs images, runs DB migrations, and deploys to Cloud Run in `asia-south1`
- [ ] **PLAT-03**: Monorepo (pnpm workspaces) with `apps/mobile`, `apps/api`, `apps/jobs`, `packages/shared`, `packages/algo`, `packages/ai`, all strict TypeScript
- [ ] **PLAT-04**: Cloud SQL Postgres 16 with pgvector; schema migrations are versioned and reproducible
- [ ] **PLAT-05**: A Vertex AI client wrapper with config-driven model IDs, retries, token/cost logging, and an eval harness runnable in CI
- [ ] **PLAT-06**: Expo app runs on a physical Android/iOS device via an EAS development build and talks to the deployed API

### Authentication & Profile

- [ ] **AUTH-01**: User can sign in with Google or email link (Firebase Auth / Identity Platform); API verifies ID tokens
- [ ] **AUTH-02**: User session persists across app restarts
- [ ] **AUTH-03**: User can export and delete all their data (DPDP)
- [ ] **PROF-01**: Onboarding captures exam target (default CSE 2027), weekday availability in minutes, work hours/quiet hours, and per-subject self-assessment
- [ ] **PROF-02**: Onboarding runs a short diagnostic (≈20 PYQ-based questions across subjects) to seed node mastery

### Knowledge Base

- [ ] **KB-01**: Syllabus graph covers Prelims GS-I, CSAT and Mains GS I–IV + Essay as atomic nodes with parent, prerequisites, estimated minutes and Prelims/Mains relevance
- [ ] **KB-02**: PYQ bank holds Prelims GS-I 2011–2026 and Mains GS 2013–2026 questions, each tagged to ≥1 syllabus node with question type and answer key (Prelims)
- [ ] **KB-03**: Every syllabus node has a primary recommended source (book/NCERT + chapter, by reference only) and a one-line reason
- [ ] **KB-04**: Strategy knowledge base stores short cited claims (source URL + date); AI strategy answers cite at least one claim or decline
- [ ] **KB-05**: Node PYQ frequency statistics are computed from the bank (not copied from coaching sites)
- [ ] **KB-06**: An admin/review path lets a human approve or correct AI-suggested tags and source mappings

### Memory Style & Cues

- [ ] **MEM-01**: User can take the Memory Style Test: 4 micro-blocks learned via repetition, first-principles, memory palace and mnemonic, with recall measured immediately, at 24h and at 72h
- [ ] **MEM-02**: The system computes a cue-efficacy vector (cue type × content type) from test results and shows the user a plain-language summary
- [ ] **MEM-03**: The cue-efficacy vector updates from ongoing review outcomes tagged by the cue type shown
- [ ] **CUE-01**: For any node or card, user can get a repetition set (flashcards + cloze)
- [ ] **CUE-02**: User can set up a personal memory palace once and receive placements for a topic's facts
- [ ] **CUE-03**: User can get a mnemonic that is verified to decode back to the original facts
- [ ] **CUE-04**: User can get a first-principles explanation followed by a one-line teach-back that is graded
- [ ] **CUE-05**: The cue type offered by default follows the learner's efficacy vector; user can rate cues 👍/👎

### Scheduling, Revision & Reminders

- [ ] **SCHED-01**: The system generates a weekly plan and a daily to-do of time-boxed typed tasks (Learn / Revise / Practice / Current Affairs) that fits the day's available minutes
- [ ] **SCHED-02**: Each Learn task names the syllabus node and its recommended source + chapter
- [ ] **SCHED-03**: Plans are computed backward from Prelims (23 May 2027) with phase-based time ratios and a first-pass coverage deadline
- [ ] **SCHED-04**: Nightly rebalance re-queues missed tasks by priority and tells the user what was deferred and why
- [ ] **SCHED-05**: User can say "I only have N minutes today" and get an immediate replan
- [ ] **SRS-01**: Cards and node-level revision units are scheduled with FSRS (target retention configurable, default 0.9)
- [ ] **SRS-02**: Node mastery is updated from review grades, MCQ results and time decay
- [ ] **SRS-03**: Every studied node is guaranteed ≥3 revision touches before Prelims in the plan
- [ ] **NOTIF-01**: User receives push notifications for daily plan ready, due reviews and the CA quiz, respecting quiet hours
- [ ] **NOTIF-02**: User can configure notification types and times

### Current Affairs

- [ ] **CA-01**: A daily job ingests PIB, PRS and selected government/regulator releases plus user-shared links, deduplicated
- [ ] **CA-02**: Each item gets a UPSC-angle summary with a source link, mapped to syllabus nodes
- [ ] **CA-03**: User gets 5–10 UPSC-style MCQs daily (statement-based, "how many of the above", match-the-pair) with explanations and sources
- [ ] **CA-04**: Every generated MCQ passes an automated verifier (single correct answer, grounded, unambiguous) before being shown
- [ ] **CA-05**: Wrong CA answers create SRS cards and update node mastery; user can report an erroneous question

### Nudges

- [ ] **NUDGE-01**: Rule engine decides when to nudge (≤3/day, based on plan progress, streaks, deadlines); Gemini writes the copy in the user's chosen tone
- [ ] **NUDGE-02**: User receives a weekly coach note (what went well, what slipped, one concrete change)

### Elective Discovery

- [ ] **ELEC-01**: User can have a guided interview with the Elective Discovery Agent about background, interests and constraints
- [ ] **ELEC-02**: The agent uses UPSC annual-report optional success rates, syllabus length and GS overlap (computed from the graph) as cited evidence
- [ ] **ELEC-03**: User can take a taster test of PYQs for up to 3 shortlisted optionals
- [ ] **ELEC-04**: User receives a ranked shortlist (≤3) with an evidence table, risks and a 12-week coverage outline; the chosen optional is saved and its nodes added to the plan

## v2 Requirements

Deferred to later milestones. Tracked but not in the v1.0 roadmap.

### v1.1 Prelims Engine

- **PRED-01**: Topic-likelihood score per node from PYQ frequency, recurrence, CA salience and official-document salience
- **PRED-02**: Backtest report (train ≤2021, test 2022–2026) with top-k precision; weights tuned on it
- **PRED-03**: Likelihood bands with reasons shown in-app and fed into scheduler priority
- **EVAL-01**: In-app Prelims mock and sectional tests with negative marking
- **EVAL-02**: Test analytics: accuracy by node, attempt-vs-accuracy curve, time per question, mistake tagging
- **EVAL-03**: Weekly report + Prelims readiness score with projected range
- **NOTIF-03**: Learned best send-time per user (per-hour bandit)
- **CSAT-01**: CSAT diagnostic and practice module
- **SRS-04**: Per-user FSRS parameter optimisation after ~1,000 reviews

### v1.2 Mains Engine

- **MAINS-01**: Photo of a handwritten answer → Gemini multimodal OCR → rubric-based evaluation and an improved outline
- **MAINS-02**: Evaluation calibrated against human-graded samples (agreement metric)
- **MAINS-03**: Essay and Ethics case-study practice
- **MAINS-04**: Mains-mode scheduler (post-Prelims) including optional coverage
- **CUE-06**: Imagen-generated memory-palace visuals

### v2.0 Public Launch

- **PUB-01**: Public onboarding, payments/subscriptions, Hindi medium, mentor review marketplace

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hosting copyrighted book/newspaper text | Copyright; link + summarise and reference by title/chapter only |
| Live classes / video lectures | Not the core value; direction + retention is |
| Social feed / community chat | Distraction in an attempt year; revisit post-launch |
| Payments in v1 | No monetisation until after dogfooding through Prelims 2027 |
| Web client | Mobile first; admin tooling only |
| Non-Vertex AI providers | Constraint: all AI on GCP Vertex AI |
| Questionnaire-based "learning style" typing | Weak evidence; replaced by measured recall experiment (MEM-01..03) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 1 | Pending |
| PLAT-05 | Phase 1 | Pending |
| PLAT-06 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| KB-01 | Phase 2 | Pending |
| KB-02 | Phase 2 | Pending |
| KB-03 | Phase 2 | Pending |
| KB-04 | Phase 2 | Pending |
| KB-05 | Phase 2 | Pending |
| KB-06 | Phase 2 | Pending |
| PROF-01 | Phase 3 | Pending |
| PROF-02 | Phase 3 | Pending |
| MEM-01 | Phase 3 | Pending |
| MEM-02 | Phase 3 | Pending |
| MEM-03 | Phase 3 | Pending |
| SCHED-01 | Phase 4 | Pending |
| SCHED-02 | Phase 4 | Pending |
| SCHED-03 | Phase 4 | Pending |
| SCHED-04 | Phase 4 | Pending |
| SCHED-05 | Phase 4 | Pending |
| SRS-01 | Phase 4 | Pending |
| SRS-02 | Phase 4 | Pending |
| SRS-03 | Phase 4 | Pending |
| NOTIF-01 | Phase 4 | Pending |
| NOTIF-02 | Phase 4 | Pending |
| CA-01 | Phase 5 | Pending |
| CA-02 | Phase 5 | Pending |
| CA-03 | Phase 5 | Pending |
| CA-04 | Phase 5 | Pending |
| CA-05 | Phase 5 | Pending |
| CUE-01 | Phase 6 | Pending |
| CUE-02 | Phase 6 | Pending |
| CUE-03 | Phase 6 | Pending |
| CUE-04 | Phase 6 | Pending |
| CUE-05 | Phase 6 | Pending |
| NUDGE-01 | Phase 6 | Pending |
| NUDGE-02 | Phase 6 | Pending |
| ELEC-01 | Phase 7 | Pending |
| ELEC-02 | Phase 7 | Pending |
| ELEC-03 | Phase 7 | Pending |
| ELEC-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-05*
*Last updated: 2026-11-05 after initialization*
