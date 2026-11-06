# Roadmap: Koach

## Overview

Koach goes from an empty repo to a coach Shivanshi uses every day for her CSE 2027 attempt (Prelims 23 May 2027).

**Milestone v1.0 "Daily Coach MVP"** (~4 weeks, target ~3 Dec 2026):
1. Lay the GCP foundation and the UPSC knowledge base.
2. Learn how the learner learns best (Learning Pattern Test).
3. Deliver the daily loop: plan → PYQ-first study from the right source → spaced revision → current-affairs quiz → memory cues and nudges.
4. Include Optional Discovery, because the optional must be chosen by 15 Dec 2026.

**Later milestones:**
- **v1.1 Prelims Engine** (~Jan 2027): topic prediction, mocks and analytics, elimination trainer, map mode, CSAT, adaptive tuning.
- **v1.2 Mains Engine** (~Mar 2027, used from late May 2027): answer evaluation, Mains mode, Service Preference Advisor.
- **v2.0 Public Launch:** after Prelims 2027.

Feature definitions: `.planning/PROJECT.md`. Requirement IDs: `.planning/REQUIREMENTS.md`.

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

- [ ] **Phase 1: Foundation & GCP Deploy** - Monorepo, GCP bootstrap, Cloud SQL, Vertex + speech wrapper, auth, `deploy.yaml`, app on device
- [ ] **Phase 2: UPSC Knowledge Base** - Syllabus graph (incl. optional syllabi), PYQ bank, source map, PYQ stats, strategy KB, playbooks, review tooling, naming guard
- [x] **Phase 3: Onboarding & Learning Pattern Test** - Profile, diagnostic, four pattern games → strength profile
- [x] **Phase 4: Planner, Revision & Reminders** - Scheduler, PYQ-first sessions, FSRS, mastery, mistakes notebook, heatmap, push reminders
- [x] **Phase 5: Current Affairs Pipeline & Daily Quiz** - Ingest → summarise → link to syllabus → verified UPSC-style MCQs
- [x] **Phase 6: Memory Cues & Nudges** - Pattern-matched cues (palace, audio, mnemonics, cue sheets, drills), repetition, first-principles; nudges, coach note, well-being check-in
- [ ] **Phase 7: Optional Discovery** - Fit quiz ranking, explorer & compare, decision coach

### 📋 v1.1 Prelims Engine

- [ ] **Phase 8: Topic Prediction & Backtest** - Expert-signal likelihood model, backtest, practice questions for High-band topics
- [ ] **Phase 9: Mock Tests & Analytics** - Prelims mocks, analytics, elimination trainer, weekly report, readiness score
- [ ] **Phase 10: Adaptive Tuning, CSAT & Map Mode** - Learned reminder timing, per-user FSRS, CSAT module, layered map learning

### 📋 v1.2 Mains Engine

- [ ] **Phase 11: Answer-Writing Evaluation** - Photo or typed answer → demand decoder → rubric feedback; theme bank
- [ ] **Phase 12: Mains Mode** - Post-Prelims scheduler, optional coverage, essay and ethics, palace images
- [ ] **Phase 13: Service Preference Advisor** - Service + cadre preference order for DAF-I

## Phase Details

### Phase 1: Foundation & GCP Deploy
**Goal**: A deployable skeleton: the Expo app on Shivanshi's phone signs in and calls a TypeScript API on Cloud Run backed by Cloud SQL, with working Vertex AI and speech call paths and `deploy.yaml` CI/CD.
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. Running the bootstrap script on a fresh GCP project creates everything the API needs (APIs incl. Vertex AI and speech, service accounts, Artifact Registry, Cloud SQL, secrets, budget alert)
  2. Pushing to `main` triggers Cloud Build with `deploy.yaml`, which runs checks and migrations, deploys `koach-api` to Cloud Run (`asia-south1`) and passes the `/health` smoke test
  3. User can sign in on a physical phone (EAS dev build) with Google and stays signed in after restarting the app; the app renders with `packages/ui` tokens *(deferred with 01-07; for now verified on web + localhost: email-code sign-in, session kept across reloads)*
  4. An authenticated `/v1/ai/ping` returns a Gemini response and a short TTS clip, with tokens/cost logged
  5. User can request a data export and account deletion
**Plans**: 7 plans (5 waves)

Plans:
- [x] 01-01: Monorepo + shared schemas + Drizzle/PGlite db + UI tokens (wave 1)
- [x] 01-02: Idempotent GCP + Firebase bootstrap for koach-dev, run after user login (wave 1)
- [x] 01-03: Fastify API: auth, /v1/me, email-code sign-in, export/delete (wave 2)
- [x] 01-06: Expo SDK 58 app: Welcome, Google + email sign-in, Today, You, Dev ping (wave 2)
- [x] 01-04: packages/ai: Vertex + TTS wrapper, cost logging, evals, /v1/ai/ping (wave 3)
- [x] 01-05: Dockerfiles, final deploy.yaml, first deploy, push-to-main trigger, live smoke (wave 4)
- [ ] 01-07: EAS Android dev build + on-phone verification (wave 5) — **deferred**: testing is on web + localhost for now (`pnpm dev`); Expo project linked, Firebase config uploaded to EAS

### Phase 2: UPSC Knowledge Base
**Goal**: The ground truth Koach reasons over (syllabus graph, tagged PYQs, a source per node, PYQ statistics, strategy KB, playbooks), queryable via API and protected by the naming guard.
**Depends on**: Phase 1
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07, KB-08
**Success Criteria** (what must be TRUE):
  1. Prelims GS-I/CSAT, Mains GS I–IV and Essay exist as a graph of atomic nodes with prerequisites and time estimates; all ~48 optional syllabi exist at topic level
  2. Prelims GS-I PYQs 2011–2026 and Mains GS PYQs 2013–2026 are stored with node, type, source-type and directive tags; a sampled audit shows ≥90% tag accuracy
  3. Every node shows a source + chapter with a one-line reason; no copyrighted text is stored; institute-titled books show neutral labels
  4. Node PYQ frequency and subject weightage are computed from the bank and served by the API
  5. A reviewer can approve or correct tags and source mappings through an admin path
  6. Playbooks (PB-*) exist as config, and a test proves that no blocked name reaches any client-facing API field or generated text
**Plans**: 6 plans (4 waves)

Plans:
- [x] 02-01: KB schema, packages/kb + packages/guard, read API, naming guard hook (wave 1)
- [x] 02-02: Syllabus graph seed: GS nodes + optional topics (wave 2)
- [ ] 02-03: PYQ bank: official PDFs → structured JSON (wave 2)
- [ ] 02-04: AI tagging of PYQs and the source map (wave 3)
- [x] 02-05: Strategy KB seed and grounding (wave 3)
- [ ] 02-06: Admin review page, audit, deploy (wave 4)

### Phase 3: Onboarding & Learning Pattern Test
**Goal**: Koach knows the learner: availability, starting level, and learning-pattern strengths.
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, LPT-01, LPT-02, LPT-03
**Success Criteria** (what must be TRUE):
  1. User completes onboarding (target, weekday minutes, work/quiet hours, self-assessment) in ≤15 minutes
  2. User takes the ~20-question diagnostic (or skips it) and sees seeded strengths/weaknesses by subject
  3. User completes the ~15-minute Learning Pattern Test (Map Pins + Pattern Grid, Listen & Recall typed or spoken, Read & Write Back, Arrange & Trace, then delayed recall)
  4. User sees a strength profile (four 0–100 scores + one plain line), never a single-type label
  5. Pattern scores update from later recall on pattern-tagged cues; a retest is offered after ~8 weeks
**Plans**: 4 plans (3 waves)

Plans:
- [x] 03-01: Profile, subject levels and the diagnostic API (wave 1)
- [x] 03-02: packages/lpt: item banks, scoring and evidence updates (wave 1)
- [x] 03-03: LPT API + speech-to-text (wave 2)
- [x] 03-04: Web app: onboarding flow, LPT games, strength profile (wave 3)

### Phase 4: Planner, Revision & Reminders
**Goal**: The core daily loop: a plan that fits the day, PYQ-first study, revision at the right time, a mistakes notebook, and reminders that respect her schedule.
**Depends on**: Phase 3
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SRS-01, SRS-02, SRS-03, PED-01, PED-02, PED-03, PED-04, NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. User opens Today and sees time-boxed Learn / Revise / Practice / CA tasks that add up to that day's available minutes, each Learn task naming the book + chapter
  2. A Learn session opens with 2–3 PYQs, shows the source + chapter and a goal line, and ends with a retrieval check
  3. Missing a day produces a rebalanced plan the next morning with a "what moved and why" note; "I only have 45 minutes" replans immediately
  4. Revisions are scheduled by FSRS, and the plan shows every studied node getting ≥3 revisions before 23 May 2027
  5. Wrong answers land in the mistakes notebook with a one-tap cause; the user can open a mastery heatmap
  6. User receives plan, due-review, CA-quiz and streak pushes outside quiet hours, and can configure types, times and tone
**Plans**: executed as one plan (see 04-CONTEXT.md, 04-SUMMARY.md)

### Phase 5: Current Affairs Pipeline & Daily Quiz
**Goal**: Current affairs arrive daily, already linked to the syllabus, as trustworthy UPSC-style questions.
**Depends on**: Phase 2; Phase 4 (SRS and mistakes notebook hand-off)
**Requirements**: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06
**Success Criteria** (what must be TRUE):
  1. A Cloud Run Job runs daily at 05:30 IST, ingesting PIB/PRS/ministry/RBI/SEBI items and user-shared links without duplicates
  2. User sees each item's UPSC-angle summary, official source link and linked syllabus nodes; each node shows its recent CA
  3. User answers 5–10 daily MCQs in real UPSC formats with explanations and sources
  4. On a held-out eval set, ≥95% of verifier-approved MCQs have exactly one correct, source-grounded answer
  5. Wrong answers go to the mistakes notebook and SRS; a reported question is pulled for everyone
**Plans**: executed as one plan (see 05-CONTEXT.md, 05-SUMMARY.md)

### Phase 6: Memory Cues & Nudges
**Goal**: Material becomes memorable in the way that suits each learner, and the coach keeps them moving.
**Depends on**: Phase 3 (strength profile), Phase 4 (cards, plan)
**Requirements**: CUE-01, CUE-02, CUE-03, CUE-04, CUE-05, CUE-06, CUE-07, CUE-08, NUDGE-01, NUDGE-02, NUDGE-03
**Success Criteria** (what must be TRUE):
  1. From any node or card, "Make it stick" opens on the learner's strongest pattern and can switch between See (memory palace, mind-map/timeline sheets), Hear (spoken cue sheet, chant, mnemonic), Write (cue sheet, blurting), Do (sequence, flowchart, trace) and Why (first-principles + teach-back)
  2. FSRS flashcards/cloze and the first-principles "why" are available to every learner
  3. Every mnemonic, chant and rhyme passes the automated decode check before display
  4. User can play a background audio revision playlist; cue ratings and recall feed the strength profile
  5. User receives ≤3 context-aware push nudges per day in their tone, a Sunday coach note, and a weekly well-being check-in that can lower next week's load
**Plans**: executed as one plan (see 06-CONTEXT.md, 06-SUMMARY.md)

### Phase 7: Optional Discovery
**Goal**: Any aspirant (first, Shivanshi by 15 Dec 2026) can choose an optional with confidence, based on personal fit and official data.
**Depends on**: Phase 2 (can run in parallel with Phases 3–6; plan integration activates once Phase 4 is live)
**Requirements**: OPT-01, OPT-02, OPT-03, OPT-04, OPT-05
**Success Criteria** (what must be TRUE):
  1. User completes the Fit Quiz in ~10 minutes and sees a ranked top 5 across all ~48 optionals, with reasons, surprising fits and the weights behind `Why?`
  2. User can open any optional's explorer page and compare 2–3 side by side; success rates come from official UPSC Annual Reports, pooled across years, with confidence bands and small-sample warnings
  3. User can ask the Decision Coach doubts and run stress tests; it shows and nudges toward the decision deadline
  4. Recording a choice saves the reasons and adds the optional's nodes to the plan with a coverage outline
**Plans**: TBD

### Phase 8: Topic Prediction & Backtest *(v1.1)*
**Goal**: Node priority reflects a data-backed likelihood of being asked, with measured accuracy.
**Depends on**: Phase 2, Phase 5 (CA salience)
**Requirements**: PRED-01, PRED-02, PRED-03, PRED-04
**Success Criteria** (what must be TRUE):
  1. A backtest report (train ≤2021, rolling test 2022–2026) shows top-k coverage, precision@k, Brier score and lift; the model beats the frequency baseline in ≥4 of 5 years, or it does not ship
  2. User sees High/Medium/Low bands with ≤3 plain reasons on node pages and the backtest's headline coverage
  3. Scheduler priority and the heatmap include likelihood
  4. High-band topics have verified UPSC-format practice questions
**Plans**: TBD

### Phase 9: Mock Tests & Analytics *(v1.1)*
**Goal**: Prelims readiness is measured, not guessed.
**Depends on**: Phase 4
**Requirements**: EVAL-01, EVAL-02, EVAL-03, PED-05
**Success Criteria** (what must be TRUE):
  1. User takes scheduled full and sectional mocks with negative marking
  2. User sees accuracy by node, the attempt-vs-accuracy curve, time per question and mistake causes
  3. After each PYQ/mock question, the user can use the elimination trainer and see every wrong option explained
  4. User receives a weekly report and a Prelims readiness score with a projected range
**Plans**: TBD

### Phase 10: Adaptive Tuning, CSAT & Map Mode *(v1.1)*
**Goal**: The system tunes itself to the learner; CSAT is covered; geography and places-in-news are learned on layered maps.
**Depends on**: Phase 4, Phase 9
**Requirements**: NOTIF-03, SRS-04, CSAT-01, PED-06
**Success Criteria** (what must be TRUE):
  1. Reminders shift toward each user's best-responding hours; mock-test reminders are sent
  2. FSRS parameters are re-fitted per user after ~1,000 reviews
  3. User can take a CSAT diagnostic and practise by question type
  4. Geography/environment/places-in-news nodes open in map mode with layered maps and tap-to-locate drills; a monthly places-in-news map is published
**Plans**: TBD

### Phase 11: Answer-Writing Evaluation *(v1.2)*
**Goal**: Mains answers (handwritten photo or typed) get fast, calibrated, actionable feedback.
**Depends on**: Phase 2
**Requirements**: MAINS-01, MAINS-02, PED-07, PED-08
**Success Criteria** (what must be TRUE):
  1. User submits a photo (default) or typed answer and receives a rubric score, feedback and an improved outline
  2. Before writing, the demand decoder shows core theme + directive + dimensions
  3. Evaluation agreement with human-graded samples is reported and meets the agreed threshold
  4. User can browse and revise theme-bank cards for recurring Mains themes
**Plans**: TBD

### Phase 12: Mains Mode *(v1.2)*
**Goal**: After 23 May 2027, Koach switches to a Mains-focused plan covering the optional, essay and ethics.
**Depends on**: Phase 7, Phase 11
**Requirements**: MAINS-03, MAINS-04, CUE-09
**Success Criteria** (what must be TRUE):
  1. After Prelims, the planner switches to Mains mode with daily Answer-writing tasks and optional coverage
  2. User can practise essays and ethics case studies with evaluation
  3. Memory-palace placements can show generated images
**Plans**: TBD

### Phase 13: Service Preference Advisor *(v1.2)*
**Goal**: Before DAF-I, the user has a reasoned service and cadre preference order.
**Depends on**: Phase 9 (score trends for an indicative rank range)
**Requirements**: SVC-01, SVC-02, SVC-03
**Success Criteria** (what must be TRUE):
  1. User completes the advisor interview (values, interests, home state/cadre, eligibility)
  2. The advisor shows previous years' allocation-by-rank evidence and the current cadre policy for the user's indicative rank range
  3. User receives a reasoned preference order and records their own final order
**Plans**: TBD

## Progress

**Execution Order:**
1 → 2 → (3 ∥ 7) → 4 → (5 ∥ 6) → v1.0 ship → 8 → 9 → 10 → 11 → (12 ∥ 13)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & GCP Deploy | v1.0 | 0/7 | Planned | - |
| 2. UPSC Knowledge Base | v1.0 | 0/TBD | Not started | - |
| 3. Onboarding & Learning Pattern Test | v1.0 | 0/TBD | Not started | - |
| 4. Planner, Revision & Reminders | v1.0 | 0/TBD | Not started | - |
| 5. Current Affairs Pipeline & Daily Quiz | v1.0 | 0/TBD | Not started | - |
| 6. Memory Cues & Nudges | v1.0 | 0/TBD | Not started | - |
| 7. Optional Discovery | v1.0 | 0/TBD | Not started | - |
| 8. Topic Prediction & Backtest | v1.1 | 0/TBD | Not started | - |
| 9. Mock Tests & Analytics | v1.1 | 0/TBD | Not started | - |
| 10. Adaptive Tuning, CSAT & Map Mode | v1.1 | 0/TBD | Not started | - |
| 11. Answer-Writing Evaluation | v1.2 | 0/TBD | Not started | - |
| 12. Mains Mode | v1.2 | 0/TBD | Not started | - |
| 13. Service Preference Advisor | v1.2 | 0/TBD | Not started | - |
