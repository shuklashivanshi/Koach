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
- [ ] **KB-04**: Strategy knowledge base stores short cited claims (source URL + date) internally; AI strategy answers are grounded in at least one claim or decline. The UI never names teachers, institutes, platforms or channels (shows "based on N accounts" or an official source)
- [ ] **KB-07**: PYQs carry a source-type tag (static / partial / current-affairs-driven) and Mains PYQs carry their directive word
- [ ] **KB-08**: Anonymous pedagogy playbooks (PB-*) are stored as config the planner, cues and evaluators read; an internal store accepts the user's class notes for refinement
- [ ] **KB-05**: Node PYQ frequency statistics are computed from the bank (not copied from coaching sites)
- [ ] **KB-06**: An admin/review path lets a human approve or correct AI-suggested tags and source mappings

### Learning Pattern & Cues

- [ ] **MEM-01**: User can take the ~15-minute Learning Pattern Test: four games (Visual: Map Pins + Pattern Grid; Auditory: Listen & Recall, typed or spoken; Reading/Writing: Read & Write Back; Kinesthetic: Arrange & Trace) plus a delayed recall round
- [ ] **MEM-02**: The system scores each pattern 0–100 (0.6 immediate + 0.4 delayed, normalised) and shows a strength profile with one plain-language line, never a single-type label
- [ ] **MEM-03**: Pattern scores update from recall on cues tagged by pattern; a re-test is offered every ~8 weeks
- [ ] **CUE-01**: Repetition for everyone: FSRS flashcards + cloze for any node or card
- [ ] **CUE-02**: Visual: user sets up a personal memory palace once and gets room placements for a topic's facts; mind-map / timeline / colour-coded cue sheets
- [ ] **CUE-03**: Auditory: verbal mnemonics, rhythmic chants and short rhymes, each verified to decode back to the original facts
- [ ] **CUE-04**: First-principles "why" for everyone (3–5 causal steps after the user's own attempt) with a graded one-line teach-back
- [ ] **CUE-05**: The default cue format follows the strength profile (~60% strongest / 25% second / 15% others); user can switch format and rate cues 👍/👎
- [ ] **CUE-07**: Auditory: spoken cue sheets and chants as text-to-speech audio, a listen-and-repeat drill, and a revision playlist that plays in the background
- [ ] **CUE-08**: Reading/Writing: one-page cue sheets (≤12 lines) and write-from-memory ("blurting") drills scored against key points
- [ ] **CUE-09**: Kinesthetic: drag-to-sequence drills (timelines, processes) and build-the-flowchart drills generated from a node's facts

### Scheduling, Revision & Reminders

- [ ] **SCHED-01**: The system generates a weekly plan and a daily to-do of time-boxed typed tasks (Learn / Revise / Practice / Current Affairs) that fits the day's available minutes
- [ ] **SCHED-02**: Each Learn task names the syllabus node and its recommended source + chapter
- [ ] **SCHED-03**: Plans are computed backward from Prelims (23 May 2027) with phase-based time ratios and a first-pass coverage deadline
- [ ] **SCHED-04**: Nightly rebalance re-queues missed tasks by priority and tells the user what was deferred and why
- [ ] **SCHED-05**: User can say "I only have N minutes today" and get an immediate replan
- [ ] **SRS-01**: Cards and node-level revision units are scheduled with FSRS (target retention configurable, default 0.9)
- [ ] **SRS-02**: Node mastery is updated from review grades, MCQ results and time decay
- [ ] **SRS-03**: Every studied node is guaranteed ≥3 revision touches before Prelims in the plan
- [ ] **PED-01**: Learn tasks follow PYQ-first priming: 2–3 PYQs on the node, then source + chapter, then a 3–5 question retrieval check
- [ ] **PED-02**: Every wrong answer is logged in a mistakes notebook with a cause tag (concept gap / misread / elimination error / guess), turned into an SRS card, and summarised monthly as "recurring traps"
- [ ] **PED-03**: User can view a syllabus memory heatmap (mastery, later × likelihood)
- [ ] **PED-04**: Each study session shows one concrete goal line; a weekly well-being check-in can lower next week's load
- [ ] **NOTIF-01**: User receives push notifications for daily plan ready, due reviews and the CA quiz, respecting quiet hours
- [ ] **NOTIF-02**: User can configure notification types and times

### Current Affairs

- [ ] **CA-01**: A daily job ingests PIB, PRS and selected government/regulator releases plus user-shared links, deduplicated
- [ ] **CA-02**: Each item gets a UPSC-angle summary with a source link, mapped to syllabus nodes
- [ ] **CA-03**: User gets 5–10 UPSC-style MCQs daily (statement-based, "how many of the above", match-the-pair) with explanations and sources
- [ ] **CA-04**: Every generated MCQ passes an automated verifier (single correct answer, grounded, unambiguous) before being shown
- [ ] **CA-05**: Wrong CA answers create SRS cards and update node mastery; user can report an erroneous question
- [ ] **CA-06**: Every CA item links to its static syllabus node, and every node shows its recent CA items

### Nudges

- [ ] **NUDGE-01**: Rule engine decides when to nudge (≤3/day, based on plan progress, streaks, deadlines); Gemini writes the copy in the user's chosen tone
- [ ] **NUDGE-02**: User receives a weekly coach note (what went well, what slipped, one concrete change)

### Optional Discovery

- [ ] **ELEC-01**: User can take a ~10-minute Fit Quiz (background, interests, reading taste, answer style, time, language, risk appetite) and get a ranked top 5 across all ~48 optionals with reasons and "surprising fits"
- [ ] **ELEC-02**: User can explore any optional (syllabus size and hours, GS/Essay overlap %, PYQ style mix, multi-year success rate with confidence band and small-sample warning, standard books, typical prep time, personal fit) and compare 2–3 side by side
- [ ] **ELEC-03**: User can talk to a Decision Coach that answers doubts from the evidence, runs stress tests, busts myths with data, and nudges toward a decision deadline
- [ ] **ELEC-04**: User records the final choice and reasons; the optional's syllabus nodes are added to the plan with a coverage outline
- [ ] **ELEC-05**: Optional-wise appeared/recommended counts are ingested from official UPSC Annual Reports (multi-year), not from third-party tables

## v2 Requirements

Deferred to later milestones. Tracked but not in the v1.0 roadmap.

### v1.1 Prelims Engine

- **PRED-01**: Topic-likelihood score per node from the expert signals: weighted PYQ frequency, recurrence gap, subject trend, CA salience, news triggers (Acts, judgments, reports, summits), anniversaries, Budget/Economic Survey presence, static anchors, Mains directive mix (see research/TOPIC-PREDICTION.md)
- **PRED-02**: Rolling backtest (train ≤2021, test 2022–2026, no leakage) reporting top-k coverage, precision@k, Brier score and lift over a frequency baseline; ships only if it beats the baseline in ≥4 of 5 years
- **PRED-03**: Likelihood bands with ≤3 plain reasons shown in-app and fed into scheduler priority, plus the backtest's headline coverage
- **PRED-04**: UPSC-format practice questions (Prelims MCQs + Mains prompts with varied directives) generated for High-band topics and passed through the verifier
- **PED-05**: Elimination trainer: after each PYQ the user marks which statements they eliminated and why; every wrong option is explained
- **PED-06**: Map mode for geography/environment/places-in-news: layered blank map, tap-to-locate drills, monthly places-in-news map
- **EVAL-01**: In-app Prelims mock and sectional tests with negative marking
- **EVAL-02**: Test analytics: accuracy by node, attempt-vs-accuracy curve, time per question, mistake tagging
- **EVAL-03**: Weekly report + Prelims readiness score with projected range
- **NOTIF-03**: Learned best send-time per user (per-hour bandit)
- **CSAT-01**: CSAT diagnostic and practice module
- **SRS-04**: Per-user FSRS parameter optimisation after ~1,000 reviews

### v1.2 Mains Engine

- **MAINS-01**: Photo of a handwritten answer (default) or typed answer → Gemini multimodal OCR → rubric-based evaluation and an improved outline
- **MAINS-02**: Evaluation calibrated against human-graded samples (agreement metric)
- **MAINS-03**: Essay and Ethics case-study practice
- **MAINS-04**: Mains-mode scheduler (post-Prelims) including optional coverage
- **CUE-06**: Imagen-generated memory-palace visuals
- **PED-07**: Question-demand decoder before answer writing (core theme + directive + dimensions checklist)
- **PED-08**: Mains theme bank of reusable value-add cards (data, examples, reports, judgments, committee recommendations) per recurring theme
- **SVC-01**: Service Preference Advisor interview (values, interests, home state/cadre considerations, eligibility)
- **SVC-02**: Advisor evidence from previous years' service allocation by rank/category and the current cadre allocation policy, with a realistic rank range from the user's scores
- **SVC-03**: User receives a reasoned service + cadre preference order to use for DAF-I; the final order stays the user's decision

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
| Labelling a learner as a single "type" or teaching only one modality | Meshing evidence is weak; a strength profile + mixed cues + ongoing measurement instead |
| Optional taster test / taster week | User choice 2026-11-05 |
| AI-generated music for cues | User choice 2026-11-05; spoken chants via TTS instead |
| WhatsApp / email nudges | User choice 2026-11-05; app push only |
| Naming teachers, institutes, platforms, channels or courses in the UI | User rule; pedagogy encoded as anonymous playbooks |
| Reusing educators' lecture content or notes | Only teaching patterns are encoded |
| A "guaranteed" predicted paper | Predictions are likelihood bands with reasons |

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
| KB-07 | Phase 2 | Pending |
| KB-08 | Phase 2 | Pending |
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
| PED-01 | Phase 4 | Pending |
| PED-02 | Phase 4 | Pending |
| PED-03 | Phase 4 | Pending |
| PED-04 | Phase 4 | Pending |
| NOTIF-01 | Phase 4 | Pending |
| NOTIF-02 | Phase 4 | Pending |
| CA-01 | Phase 5 | Pending |
| CA-02 | Phase 5 | Pending |
| CA-03 | Phase 5 | Pending |
| CA-04 | Phase 5 | Pending |
| CA-05 | Phase 5 | Pending |
| CA-06 | Phase 5 | Pending |
| CUE-01 | Phase 6 | Pending |
| CUE-02 | Phase 6 | Pending |
| CUE-03 | Phase 6 | Pending |
| CUE-04 | Phase 6 | Pending |
| CUE-05 | Phase 6 | Pending |
| CUE-07 | Phase 6 | Pending |
| CUE-08 | Phase 6 | Pending |
| CUE-09 | Phase 6 | Pending |
| NUDGE-01 | Phase 6 | Pending |
| NUDGE-02 | Phase 6 | Pending |
| ELEC-01 | Phase 7 | Pending |
| ELEC-02 | Phase 7 | Pending |
| ELEC-03 | Phase 7 | Pending |
| ELEC-04 | Phase 7 | Pending |
| ELEC-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-05*
*Last updated: 2026-11-05 after Learning Pattern Test and Optional Discovery redesign*
