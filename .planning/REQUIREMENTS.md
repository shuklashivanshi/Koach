# Requirements: Koach

**Defined:** 2026-11-05
**Core Value:** Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data.

Feature definitions and rules live in `.planning/PROJECT.md`. Every requirement here must satisfy PROJECT.md's **Cross-Cutting Rules**: rules decide and the LLM writes; the naming rule; trust and verifier; sourcing and copyright; honest personalisation.

## v1 Requirements

Committed scope for milestone **v1.0 Daily Coach MVP** (target ~3 Dec 2026). Each maps to one roadmap phase.

### Platform (PLAT)

- [ ] **PLAT-01**: GCP projects (`koach-dev`, `koach-prod`) are bootstrapped by a script: required APIs enabled (incl. Vertex AI, Text-to-Speech, Speech-to-Text), least-privilege service accounts, Artifact Registry, Cloud SQL, Secret Manager, budget alert
- [ ] **PLAT-02**: `deploy.yaml` (Cloud Build) typechecks, lints, tests, builds and pushes the API and jobs images, runs DB migrations, deploys to Cloud Run in `asia-south1`, and smoke-tests `/healthz`
- [ ] **PLAT-03**: pnpm monorepo with `apps/mobile`, `apps/api`, `apps/jobs`, `packages/shared`, `packages/algo`, `packages/ai`, `packages/ui`, all strict TypeScript
- [ ] **PLAT-04**: Cloud SQL Postgres 16 with pgvector; schema migrations are versioned and reproducible
- [ ] **PLAT-05**: A Vertex AI + speech client wrapper with config-driven model IDs, retries, token/cost logging, and an eval harness runnable in CI
- [ ] **PLAT-06**: The Expo app runs on a physical device via an EAS development build, uses `packages/ui` tokens, and talks to the deployed API

### Authentication (AUTH)

- [ ] **AUTH-01**: User can sign in with Google or a 6-digit email code (Firebase Auth; email codes exchanged for Firebase custom tokens, delivered via Resend); the API verifies ID tokens
- [ ] **AUTH-02**: User session persists across app restarts
- [ ] **AUTH-03**: User can export and delete all their data, including voice clips and answer photos (DPDP)

### Profile & Diagnostic (PROF)

- [ ] **PROF-01**: Onboarding captures exam target (default CSE 2027), weekday availability in minutes, work/quiet hours, and per-subject self-assessment (New / Some / Strong)
- [ ] **PROF-02**: Onboarding runs a ~20-question PYQ-based diagnostic that seeds node mastery; if skipped, a starter plan is built from the self-assessment

### Knowledge Base (KB)

- [ ] **KB-01**: Syllabus graph covers Prelims GS-I, CSAT, Mains GS I–IV and Essay as atomic nodes (parent, prerequisites, estimated minutes, Prelims/Mains relevance), plus all ~48 optional syllabi at topic level
- [ ] **KB-02**: PYQ bank holds Prelims GS-I 2011–2026 and Mains GS 2013–2026, each question tagged to ≥1 node with question type, source type (static / partial / current-affairs-driven), Mains directive word, and answer key (Prelims)
- [ ] **KB-03**: Every node has a primary source (NCERT or standard book + chapter, reference only) with a one-line reason; institute-titled books carry a neutral label
- [ ] **KB-04**: Node PYQ frequency and subject weightage are computed from the bank and exposed via API
- [ ] **KB-05**: Strategy knowledge base stores short claims with source URL + date internally; AI strategy answers are grounded in ≥1 claim or decline; the app shows "Based on N topper accounts" or an official source
- [ ] **KB-06**: Pedagogy playbooks (PB-*) are stored as config read by the planner, cues and evaluators; an internal store accepts the user's class notes for refinement
- [ ] **KB-07**: An admin/review path lets a human approve or correct AI-suggested tags and source mappings
- [ ] **KB-08**: A blocked-names filter (teachers, institutes, apps, platforms, channels, courses) runs on all client-facing text, including generated text

### Learning Pattern Test (LPT)

- [ ] **LPT-01**: User can take the ~15-minute Learning Pattern Test: Map Pins + Pattern Grid (visual), Listen & Recall typed or spoken (auditory), Read & Write Back (reading/writing), Arrange & Trace (kinesthetic), in random order, then a delayed recall round
- [ ] **LPT-02**: Each pattern is scored 0–100 (`0.6 × immediate + 0.4 × delayed`, normalised); user sees a strength profile with one plain-language line, never a single-type label
- [ ] **LPT-03**: Pattern scores update from recall on cues tagged by pattern; a retest is offered every ~8 weeks

### Scheduling (SCHED)

- [ ] **SCHED-01**: The system generates a weekly plan and a daily to-do of time-boxed tasks (Learn / Revise / Practice / Current Affairs) that fits the day's available minutes
- [ ] **SCHED-02**: Each Learn task names the node and its source + chapter
- [ ] **SCHED-03**: Plans are computed backward from Prelims (23 May 2027) with phase-based time ratios (Foundation → Prelims-intensive, switching automatically) and a first-pass deadline (~15 Feb 2027); priority = PYQ frequency + syllabus weight (topic likelihood is added in v1.1)
- [ ] **SCHED-04**: Nightly rebalance re-queues missed tasks by priority and tells the user what moved and why
- [ ] **SCHED-05**: User can say "I only have N minutes today" and get an immediate replan

### Revision & Mastery (SRS)

- [ ] **SRS-01**: Cards and node-level revision units are scheduled with FSRS (target retention configurable, default 0.9)
- [ ] **SRS-02**: Node mastery is updated from review grades, MCQ results and time decay
- [ ] **SRS-03**: Every studied node gets ≥3 revision touches before Prelims in the plan

### Pedagogy in the daily loop (PED)

- [ ] **PED-01**: Learn sessions follow PYQ-first priming: 2–3 PYQs on the node → source + chapter → a 3–5 question retrieval check
- [ ] **PED-02**: Every wrong answer is logged in the mistakes notebook with a one-tap cause (didn't know / misread / eliminated wrong / guessed), becomes an SRS card, and appears in a monthly "recurring traps" summary
- [ ] **PED-03**: User can view a syllabus memory heatmap of mastery
- [ ] **PED-04**: Each study session shows one concrete goal line

### Reminders (NOTIF)

- [ ] **NOTIF-01**: User receives app push notifications for plan ready, due reviews, CA quiz and streak at risk, outside work/quiet hours
- [ ] **NOTIF-02**: User can configure each notification type, its time, and the nudge tone (calm / firm / cheerful; default calm)

### Current Affairs (CA)

- [ ] **CA-01**: A daily job (05:30 IST) ingests PIB, PRS, ministry/RBI/SEBI releases and user-shared links, deduplicated
- [ ] **CA-02**: Each item gets a UPSC-angle summary with an official source link; newspapers are summarised and linked, never republished
- [ ] **CA-03**: User gets 5–10 UPSC-style MCQs daily (statement-based, "how many of the above", match-the-pair) with explanations and sources
- [ ] **CA-04**: Every generated MCQ passes an automated verifier (single correct answer, grounded, unambiguous) before being shown
- [ ] **CA-05**: Wrong CA answers go to the mistakes notebook, SRS and mastery; user can report an erroneous question and it is pulled for everyone
- [ ] **CA-06**: Every CA item links to its syllabus node(s), and every node shows its recent CA items

### Memory Cues (CUE)

- [ ] **CUE-01**: Repetition for everyone: FSRS flashcards + cloze for any node or card
- [ ] **CUE-02**: Visual: user sets up a personal memory palace once and gets room placements for a topic's facts; mind-map, timeline and colour-coded one-page cue sheets
- [ ] **CUE-03**: Auditory: spoken cue sheets and rhythmic chants/short rhymes as text-to-speech audio, a listen-and-repeat drill, and a background audio revision playlist
- [ ] **CUE-04**: Auditory: verbal mnemonics (acronyms, acronym stories, rhymes), each automatically verified to decode back to the exact facts
- [ ] **CUE-05**: Reading/Writing: one-page cue sheets (≤12 lines), cloze, and write-from-memory ("blurting") drills scored against key points
- [ ] **CUE-06**: Kinesthetic: drag-to-sequence drills (timelines, processes), build-the-flowchart and trace-on-map drills generated from a node's facts
- [ ] **CUE-07**: First-principles "why" for everyone: 3–5 causal steps shown after the user's own attempt, then a graded one-line teach-back
- [ ] **CUE-08**: The default cue format follows the strength profile (~60% strongest / 25% second / 15% others); user can switch format and rate cues 👍/👎

### Nudges (NUDGE)

- [ ] **NUDGE-01**: Rule engine decides when to nudge (≤3/day; slipping subject, streak at risk, approaching deadline, long idle); Gemini writes the copy in the user's tone; delivered by app push
- [ ] **NUDGE-02**: User receives a Sunday coach note (kept / slipped / one change)
- [ ] **NUDGE-03**: User answers a weekly well-being check-in; reported strain reduces next week's planned load

### Optional Discovery (OPT)

- [ ] **OPT-01**: User can take a ~10-minute Fit Quiz (background, subjects enjoyed, reading taste, answer style, time, language, risk appetite) and get a ranked top 5 across all ~48 optionals with one-line reasons and "surprising fits"; weights are config and shown behind `Why?`
- [ ] **OPT-02**: User can open any optional's explorer page (syllabus size and hours, GS/Essay overlap %, PYQ style mix, multi-year success rate with confidence band and small-sample warning, standard books, typical prep time, personal fit) and compare 2–3 side by side
- [ ] **OPT-03**: User can talk to a Decision Coach that answers doubts from the evidence, runs stress tests, busts myths with data, and nudges toward a decision deadline (Shivanshi: 15 Dec 2026)
- [ ] **OPT-04**: User records the final choice and reasons; the optional's nodes join the plan with a coverage outline (applied as soon as the planner is live)
- [ ] **OPT-05**: Optional-wise appeared/recommended counts are ingested from official UPSC Annual Reports (multi-year), not from third-party tables

## v2 Requirements

Deferred to later milestones. Tracked, not in the v1.0 scope.

### v1.1 Prelims Engine

- **PRED-01**: Topic-likelihood score per node from the expert signals: weighted PYQ frequency, recurrence gap, subject trend, CA salience, news triggers (Acts, judgments, reports, summits), anniversaries, Budget/Economic Survey presence, static anchors, Mains directive mix (see `research/TOPIC-PREDICTION.md`)
- **PRED-02**: Rolling backtest (train ≤2021, test 2022–2026, no leakage) reporting top-k coverage, precision@k, Brier score and lift over a frequency baseline; ships only if it beats the baseline in ≥4 of 5 years
- **PRED-03**: Likelihood bands with ≤3 plain reasons shown in the app and added to scheduler priority and the heatmap (mastery × likelihood), plus the backtest's headline coverage
- **PRED-04**: UPSC-format practice questions (Prelims MCQs + Mains prompts with varied directives) generated for High-band topics and passed through the verifier
- **EVAL-01**: In-app Prelims mock and sectional tests with negative marking; *Test* tasks scheduled by the planner
- **EVAL-02**: Test analytics: accuracy by node, attempt-vs-accuracy curve, time per question, mistake causes
- **EVAL-03**: Weekly report + Prelims readiness score with projected range
- **PED-05**: Elimination trainer: after each PYQ the user marks which statements they eliminated and why; every wrong option is explained
- **PED-06**: Map mode for geography, environment and places-in-news: layered blank map, tap-to-locate drills, monthly places-in-news map
- **NOTIF-03**: Learned best send time per user (per-hour bandit); mock-test reminders
- **SRS-04**: Per-user FSRS parameter optimisation after ~1,000 reviews
- **CSAT-01**: CSAT diagnostic and practice module

### v1.2 Mains Engine

- **MAINS-01**: Answer submitted as a handwriting photo (default) or typed → Gemini reads it → rubric evaluation (demand met, structure, content vs. model outline, examples/data, diagrams, word limit) → feedback + improved outline
- **MAINS-02**: Evaluation calibrated against human-graded samples (agreement metric reported)
- **MAINS-03**: Essay and Ethics case-study practice
- **MAINS-04**: Mains-mode scheduler after Prelims, with *Answer-writing* tasks and optional coverage
- **PED-07**: Question-demand decoder before answer writing (core theme + directive + dimensions checklist)
- **PED-08**: Mains theme bank of reusable value-add cards (data, examples, reports, judgments, committee recommendations) per recurring theme
- **CUE-09**: Imagen-generated images for memory-palace placements
- **SVC-01**: Service Preference Advisor interview (values, interests, home-state/cadre considerations, eligibility)
- **SVC-02**: Advisor evidence from previous years' service allocation by rank/category and the current DoPT cadre allocation policy, with an indicative rank range from the user's scores
- **SVC-03**: User receives a reasoned service + cadre preference order for DAF-I; the final order stays the user's decision

### v2.0 Public Launch

- **PUB-01**: Public onboarding, payments/subscriptions, Hindi medium, mentor review marketplace

## Out of Scope

| Feature | Reason |
|---------|--------|
| Naming teachers, institutes, apps, platforms, channels or courses in the app | User rule; pedagogy is encoded as anonymous playbooks |
| Reusing educators' lecture content or notes | Only teaching patterns are encoded |
| Hosting copyrighted book/newspaper text | Copyright; link + summarise and reference by title/chapter only |
| Labelling a learner as a single "type" or teaching in only one modality | Meshing evidence is weak; strength profile + mixed cues + ongoing measurement instead |
| Optional taster test / taster week | User choice |
| AI-generated music for cues | User choice; spoken chants via TTS instead |
| WhatsApp / email nudges | User choice; app push only |
| A "guaranteed" predicted paper | Predictions are likelihood bands with reasons |
| Live classes / video lectures | Not the core value; direction + retention is |
| Social feed / community chat | Distraction in an attempt year; revisit after launch |
| Payments before v2.0 | No monetisation until after dogfooding through Prelims 2027 |
| Web client | Mobile first; admin tooling only |
| Non-Google AI providers | Constraint: AI on Vertex AI, speech on Google Cloud |

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
| LPT-01 | Phase 3 | Pending |
| LPT-02 | Phase 3 | Pending |
| LPT-03 | Phase 3 | Pending |
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
| CUE-06 | Phase 6 | Pending |
| CUE-07 | Phase 6 | Pending |
| CUE-08 | Phase 6 | Pending |
| NUDGE-01 | Phase 6 | Pending |
| NUDGE-02 | Phase 6 | Pending |
| NUDGE-03 | Phase 6 | Pending |
| OPT-01 | Phase 7 | Pending |
| OPT-02 | Phase 7 | Pending |
| OPT-03 | Phase 7 | Pending |
| OPT-04 | Phase 7 | Pending |
| OPT-05 | Phase 7 | Pending |
| PRED-01 | Phase 8 | Deferred (v1.1) |
| PRED-02 | Phase 8 | Deferred (v1.1) |
| PRED-03 | Phase 8 | Deferred (v1.1) |
| PRED-04 | Phase 8 | Deferred (v1.1) |
| EVAL-01 | Phase 9 | Deferred (v1.1) |
| EVAL-02 | Phase 9 | Deferred (v1.1) |
| EVAL-03 | Phase 9 | Deferred (v1.1) |
| PED-05 | Phase 9 | Deferred (v1.1) |
| NOTIF-03 | Phase 10 | Deferred (v1.1) |
| SRS-04 | Phase 10 | Deferred (v1.1) |
| CSAT-01 | Phase 10 | Deferred (v1.1) |
| PED-06 | Phase 10 | Deferred (v1.1) |
| MAINS-01 | Phase 11 | Deferred (v1.2) |
| MAINS-02 | Phase 11 | Deferred (v1.2) |
| PED-07 | Phase 11 | Deferred (v1.2) |
| PED-08 | Phase 11 | Deferred (v1.2) |
| MAINS-03 | Phase 12 | Deferred (v1.2) |
| MAINS-04 | Phase 12 | Deferred (v1.2) |
| CUE-09 | Phase 12 | Deferred (v1.2) |
| SVC-01 | Phase 13 | Deferred (v1.2) |
| SVC-02 | Phase 13 | Deferred (v1.2) |
| SVC-03 | Phase 13 | Deferred (v1.2) |

**Coverage:**
- v1 requirements: 58 total, all mapped to Phases 1–7
- v1.1–v1.2 requirements: 22, mapped to Phases 8–13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-05*
*Last updated: 2026-11-05 after full consistency review (IDs renumbered: MEM→LPT, ELEC→OPT, CUE and KB reordered)*
