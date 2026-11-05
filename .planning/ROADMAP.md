# Roadmap: Koach

## Overview

Koach goes from an empty repo to a coach Shivanshi uses daily for her CSE 2027 attempt (Prelims 23 May 2027). **Milestone v1.0 "Daily Coach MVP"** (~4 weeks, target ~3 Dec 2026) lays the GCP foundation and the UPSC knowledge base, learns how she learns best (Learning Pattern Test), then delivers the daily loop: plan → study from the right source → spaced revision → current-affairs quiz → memory cues and nudges. It also includes Optional Discovery, because the optional must be chosen by mid-December. Later milestones add the Prelims Engine (topic prediction, mocks, readiness, map mode; v1.1, ~Jan 2027), the Mains Engine (answer evaluation, service preference advisor; v1.2, ~Mar 2027), and a public launch after Prelims (v2.0).

## Milestones

- 🚧 **v1.0 Daily Coach MVP** — Phases 1–7 (in progress)
- 📋 **v1.1 Prelims Engine** — Phases 8–10 (planned)
- 📋 **v1.2 Mains Engine** — Phases 11–13 (planned)
- 📋 **v2.0 Public Launch** — after Prelims 2027 (not yet phased)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

### 🚧 v1.0 Daily Coach MVP

- [ ] **Phase 1: Foundation & GCP Deploy** - Monorepo, GCP bootstrap, Cloud SQL, Vertex wrapper, auth, `deploy.yaml`, app on device
- [ ] **Phase 2: UPSC Knowledge Base** - Syllabus graph, PYQ bank, source map, cited strategy KB, review tooling
- [ ] **Phase 3: Onboarding & Learning Pattern Test** - Learner profile, diagnostic, 4 pattern games → strength profile
- [ ] **Phase 4: Planner, Spaced Revision & Reminders** - Scheduler, FSRS, mastery, nightly rebalance, push notifications
- [ ] **Phase 5: Current Affairs Pipeline & Daily Quiz** - Ingest → summarise → map → verified UPSC-style MCQs
- [ ] **Phase 6: Memory Cues & Personalised Nudges** - Repetition / palace / mnemonic / first-principles cues; nudges + coach note
- [ ] **Phase 7: Optional Discovery** - Fit quiz ranking, explorer & compare, decision coach

### 📋 v1.1 Prelims Engine

- [ ] **Phase 8: Topic Prediction & Backtest** - Expert-signal likelihood model, backtest report, practice questions for top topics
- [ ] **Phase 9: Mock Tests & Analytics** - Prelims mocks, negative-marking analysis, elimination trainer, weekly reports, readiness score
- [ ] **Phase 10: Adaptive Tuning, CSAT & Map Mode** - Learned reminder timing, per-user FSRS parameters, CSAT module, layered map learning

### 📋 v1.2 Mains Engine

- [ ] **Phase 11: Answer-Writing Evaluation** - Handwritten photo → OCR → demand decoder → rubric feedback, theme bank
- [ ] **Phase 12: Mains Mode** - Post-Prelims scheduler, optional coverage, essay and ethics practice
- [ ] **Phase 13: Service Preference Advisor** - Service + cadre preference order for DAF-I

## Phase Details

### Phase 1: Foundation & GCP Deploy
**Goal**: A deployable skeleton: Expo app on Shivanshi's phone signs in and calls a TypeScript API on Cloud Run backed by Cloud SQL, with a working Vertex AI call path and `deploy.yaml` CI/CD.
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. Running the bootstrap script on a fresh GCP project creates everything the API needs (APIs, service accounts, Artifact Registry, Cloud SQL, secrets, budget alert)
  2. Pushing to `main` triggers Cloud Build with `deploy.yaml`, which runs tests and migrations and deploys `koach-api` to Cloud Run (`asia-south1`)
  3. User can sign in on a physical phone (EAS dev build) with Google and stay signed in after restarting the app
  4. An authenticated `/v1/ai/ping` endpoint returns a Gemini response via Vertex AI and logs tokens/cost
  5. User can request data export and account deletion
**Plans**: TBD

### Phase 2: UPSC Knowledge Base
**Goal**: The ground truth Koach reasons over: syllabus graph, tagged PYQs, a source per node, and a cited strategy KB, all queryable via API.
**Depends on**: Phase 1
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07, KB-08
**Success Criteria** (what must be TRUE):
  1. The full Prelims GS-I/CSAT and Mains GS I–IV + Essay syllabus exists as a graph of atomic nodes with prerequisites and time estimates
  2. Prelims GS-I PYQs 2011–2026 and Mains GS PYQs 2013–2026 are in the DB, each tagged to syllabus nodes; a sampled audit shows ≥90% tag accuracy
  3. Every node shows a recommended source + chapter with a one-line reason (no copyrighted text stored)
  4. Node PYQ-frequency stats are computed from the bank and visible via API
  5. A reviewer can approve or correct tags and source mappings through a simple admin path
  6. Pedagogy playbooks (PB-*) exist as config; no teacher/institute/platform name is reachable from any client-facing API field
**Plans**: TBD

### Phase 3: Onboarding & Learning Pattern Test
**Goal**: Koach knows the learner: availability, starting level, and measured retention by cue type.
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, MEM-01, MEM-02, MEM-03
**Success Criteria** (what must be TRUE):
  1. User completes onboarding (target, weekday minutes, quiet/work hours, self-assessment) in ≤15 minutes
  2. User takes a ~20-question diagnostic and sees seeded strengths/weaknesses by subject
  3. User completes the ~15-minute Learning Pattern Test: Map Pins + Pattern Grid (visual), Listen & Recall typed or spoken (auditory), Read & Write Back (reading/writing), Arrange & Trace (kinesthetic), then a delayed recall round
  4. User sees a strength profile (four 0–100 scores + one plain line), not a single-type label
  5. Recall on later cues updates the pattern scores; a re-test is offered after ~8 weeks
**Plans**: TBD

### Phase 4: Planner, Spaced Revision & Reminders
**Goal**: The core daily loop: a plan that fits the day, revision at the right time, and reminders that respect her schedule.
**Depends on**: Phase 3
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SRS-01, SRS-02, SRS-03, PED-01, PED-02, PED-03, PED-04, NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. User opens "Today" and sees time-boxed Learn / Revise / Practice / CA tasks that add up to that day's available minutes, each Learn task naming the book + chapter
  2. Missing a day leads to a rebalanced plan the next morning with a "what moved and why" note
  3. "I only have 45 minutes" produces an immediate replan
  4. Revisions are scheduled by FSRS; the plan shows every studied node getting ≥3 revisions before 23 May 2027
  5. User receives plan, due-review and CA-quiz notifications outside quiet hours, and can configure them
  6. A Learn session opens with 2–3 PYQs on the node, then source + chapter, and ends with a retrieval check; wrong answers land in the mistakes notebook with a cause tag
  7. User can open a syllabus heatmap of their mastery
**Plans**: TBD

### Phase 5: Current Affairs Pipeline & Daily Quiz
**Goal**: Current affairs arrive daily, already linked to the syllabus, as trustworthy UPSC-style questions.
**Depends on**: Phase 2 (and Phase 4 for SRS hand-off)
**Requirements**: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06
**Success Criteria** (what must be TRUE):
  1. A Cloud Run Job runs daily at 05:30 IST, ingesting PIB/PRS/government items and user-shared links without duplicates
  2. User sees each item's UPSC-angle summary, source link and mapped syllabus nodes
  3. User answers 5–10 daily MCQs in real UPSC formats with explanations and sources
  4. On a held-out eval set, ≥95% of verifier-approved MCQs have exactly one correct, source-grounded answer
  5. Wrong answers become SRS cards; user can report a faulty question and it is pulled
**Plans**: TBD

### Phase 6: Memory Cues & Personalised Nudges
**Goal**: Material becomes memorable in the way that works for this learner, and the coach keeps her moving.
**Depends on**: Phase 3, Phase 4
**Requirements**: CUE-01, CUE-02, CUE-03, CUE-04, CUE-05, CUE-07, CUE-08, CUE-09, NUDGE-01, NUDGE-02
**Success Criteria** (what must be TRUE):
  1. From any node or card, user gets cues in their strongest pattern by default and can switch: memory palace / mind-map sheets (visual); spoken cue sheets, chants, rhymes and mnemonics as audio (auditory); one-page cue sheets and blurting drills (reading/writing); sequence and flowchart drills (kinesthetic)
  2. FSRS repetition and a first-principles "why" with graded teach-back are available to everyone
  3. Every mnemonic, chant and rhyme decodes correctly back to its facts (automated check)
  4. User can play a background audio revision playlist
  5. User receives at most 3 context-aware push nudges per day in their chosen tone, plus a Sunday coach note
**Plans**: TBD

### Phase 7: Optional Discovery
**Goal**: Any aspirant (first, Shivanshi by mid-December 2026) can choose an optional with confidence, based on their fit and official data.
**Depends on**: Phase 2 (can run in parallel with Phases 3–6)
**Requirements**: ELEC-01, ELEC-02, ELEC-03, ELEC-04, ELEC-05
**Success Criteria** (what must be TRUE):
  1. User completes the Fit Quiz in ~10 minutes and sees a ranked top 5 across all ~48 optionals, with reasons and surprising fits
  2. User can open any optional's explorer page and compare 2–3 side by side; success rates come from official UPSC Annual Reports, pooled across years with confidence bands
  3. User can ask the Decision Coach doubts and run stress tests; it sets and nudges toward a decision deadline
  4. Recording a choice adds the optional's nodes to the plan with a coverage outline
**Plans**: TBD

### Phase 8: Topic Prediction & Backtest *(v1.1)*
**Goal**: Node priority reflects data-backed likelihood of being asked, with validated accuracy.
**Depends on**: Phase 2, Phase 5
**Requirements**: PRED-01, PRED-02, PRED-03, PRED-04
**Plans**: TBD

### Phase 9: Mock Tests & Analytics *(v1.1)*
**Goal**: Prelims readiness is measured, not guessed.
**Depends on**: Phase 4
**Requirements**: EVAL-01, EVAL-02, EVAL-03, PED-05
**Plans**: TBD

### Phase 10: Adaptive Tuning, CSAT & Map Mode *(v1.1)*
**Goal**: The system tunes itself to the learner; CSAT is covered; geography and places-in-news are learned on layered maps.
**Depends on**: Phase 4, Phase 9
**Requirements**: NOTIF-03, SRS-04, CSAT-01, PED-06
**Plans**: TBD

### Phase 11: Answer-Writing Evaluation *(v1.2)*
**Goal**: Handwritten Mains answers get fast, calibrated, actionable feedback.
**Depends on**: Phase 2
**Requirements**: MAINS-01, MAINS-02, PED-07, PED-08
**Plans**: TBD

### Phase 12: Mains Mode *(v1.2)*
**Goal**: After 23 May 2027, Koach switches to a Mains-focused plan including the optional, essay and ethics.
**Depends on**: Phase 7, Phase 11
**Requirements**: MAINS-03, MAINS-04, CUE-06
**Plans**: TBD

### Phase 13: Service Preference Advisor *(v1.2)*
**Goal**: Before DAF-I, the user has a reasoned service and cadre preference order.
**Depends on**: Phase 9 (score trends for a realistic rank range)
**Requirements**: SVC-01, SVC-02, SVC-03
**Plans**: TBD

## Progress

**Execution Order:**
1 → 2 → (3 ∥ 7) → 4 → (5 ∥ 6) → v1.0 ship → 8 → 9 → 10 → 11 → (12 ∥ 13)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & GCP Deploy | v1.0 | 0/TBD | Not started | - |
| 2. UPSC Knowledge Base | v1.0 | 0/TBD | Not started | - |
| 3. Onboarding & Learning Pattern Test | v1.0 | 0/TBD | Not started | - |
| 4. Planner, Spaced Revision & Reminders | v1.0 | 0/TBD | Not started | - |
| 5. Current Affairs Pipeline & Daily Quiz | v1.0 | 0/TBD | Not started | - |
| 6. Memory Cues & Personalised Nudges | v1.0 | 0/TBD | Not started | - |
| 7. Optional Discovery | v1.0 | 0/TBD | Not started | - |
| 8. Topic Prediction & Backtest | v1.1 | 0/TBD | Not started | - |
| 9. Mock Tests & Analytics | v1.1 | 0/TBD | Not started | - |
| 10. Adaptive Tuning, CSAT & Map Mode | v1.1 | 0/TBD | Not started | - |
| 11. Answer-Writing Evaluation | v1.2 | 0/TBD | Not started | - |
| 12. Mains Mode | v1.2 | 0/TBD | Not started | - |
| 13. Service Preference Advisor | v1.2 | 0/TBD | Not started | - |
