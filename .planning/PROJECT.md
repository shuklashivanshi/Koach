# Koach

## What This Is

Koach is a mobile-first (React Native + TypeScript) AI coach for the UPSC Civil Services Exam. Every day it decides what the aspirant should study, revise and practise, and **where to read it from**. It links current affairs to the static syllabus and prioritises topics using past-paper (PYQ) analysis and topic prediction. It finds each aspirant's **learning pattern** (visual, auditory, reading/writing, kinesthetic) through a short game-based test, then turns material into memory cues that suit that pattern: memory palace, spoken cue sheets and chants, mnemonics, written cue sheets, hands-on drills, plus spaced repetition and first-principles "why" for everyone. It also helps aspirants **choose their optional** and, later, their **service preferences**. Its teaching follows proven UPSC pedagogy patterns (PYQ-first learning, active recall, map-based learning, mistake logs). It is built first for Shivanshi's own CSE 2027 attempt (working, 3–5 study hrs/day) and designed multi-user so it can later serve UPSC aspirants broadly.

## Core Value

Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data (official syllabus, PYQs, measured recall). If everything else fails, the daily plan + spaced-revision engine must work.

## Business Context

- **Customer**: v1 = Shivanshi (dogfood user); later = UPSC CSE aspirants, especially working aspirants with limited hours
- **Revenue model**: None until after Prelims 2027; subscription considered for the public launch (v2.0)
- **Success metric**: Shivanshi completes ≥85% of planned weekly hours, and every Prelims syllabus node she studies gets ≥3 revisions before 23 May 2027
- **Strategy notes**: see Document Map below

## Document Map

| Document | Role | Source of truth for |
|---|---|---|
| `.planning/PROJECT.md` (this file) | Canonical product definition | Features, rules, constraints, decisions |
| `.planning/REQUIREMENTS.md` | Testable requirements with IDs | What "done" means, per requirement |
| `.planning/ROADMAP.md` | Milestones and phases | Order of work, success criteria per phase |
| `.planning/STATE.md` | Live project memory | Current position, blockers |
| `docs/PRODUCT_SPEC.md` | Product narrative for humans | Problem, users, journeys, architecture, metrics, risks |
| `docs/UI_SPEC.md` | App-wide design contract | Look, components, screens, copy |
| `.planning/research/*.md` | Evidence behind decisions | Topic prediction, pedagogy, learning patterns, optional selection |
| `deploy.yaml` | Cloud Build pipeline (draft until Phase 1) | Deployment steps |

If two documents ever disagree, **this file wins**, and the other is corrected.

## Release Plan

| Milestone | Target | Theme |
|---|---|---|
| **v1.0 Daily Coach MVP** | ~3 Dec 2026 | Foundation, knowledge base, Learning Pattern Test, daily planner + revision, current affairs, memory cues, nudges, Optional Discovery |
| **v1.1 Prelims Engine** | ~Jan 2027 | Topic prediction, mock tests and analytics, elimination trainer, map mode, CSAT, adaptive tuning |
| **v1.2 Mains Engine** | ~Mar 2027 (used from late May 2027) | Answer-writing evaluation, demand decoder, theme bank, Mains-mode scheduler, Service Preference Advisor |
| **v2.0 Public Launch** | After Prelims 2027 | Public onboarding, payments, Hindi medium |

## Cross-Cutting Rules

These apply to every feature below.

1. **Rules decide, the LLM writes.** Scheduling, prioritisation, nudge timing and scoring are deterministic code. Gemini generates language and content. No daily plan ever depends on an AI call succeeding.
2. **Naming rule.** The app never shows the name of a teacher, coaching institute, app, platform, channel or course: not in copy, reasons, notifications or generated text. Standard books (title/author + chapter), NCERT and official sources (UPSC, PIB, PRS, ministries, RBI/SEBI, Economic Survey, DoPT) may be named. A book whose title or author *is* an institute or platform is shown by a neutral label (e.g. `Environment reference · Ch 5`). All client-facing text passes a blocked-names filter.
3. **Trust.** Every factual AI output carries an official source. Every generated question passes an automated verifier before it is shown. Users can report errors, and reported items are pulled for everyone.
4. **Sourcing and copyright.** News is summarised and linked, never republished. Books are referenced by title and chapter, and no copyrighted text is stored. Educators' lecture content is never reused; only teaching *patterns* are encoded.
5. **Honest personalisation.** Learning patterns are shown as a strength profile, never a single label. Predictions are likelihood bands with reasons, never certainties.

## Features

Grouped as requested: **Foundations**, **Algorithmic features** and **AI features** (Vertex AI Gemini; speech via Google Cloud Text-to-Speech / Speech-to-Text). Each feature lists its release and requirement IDs.

### Foundations

- **Syllabus Graph** *(v1.0 · KB-01)*
  - The official UPSC syllabus broken into ~600–900 atomic **nodes**: Prelims GS-I, CSAT, Mains GS I–IV, Essay.
  - Each node has parent/children, prerequisites, estimated minutes, Prelims/Mains relevance, PYQ history and a primary source + chapter.
  - All ~48 optional syllabi are included at topic level (needed for Optional Discovery).
- **PYQ Bank** *(v1.0 · KB-02)*
  - Prelims GS-I 2011–2026 and Mains GS 2013–2026.
  - Each question is tagged to nodes with:
    - question type (statement-based, "how many of the above", match-the-pair, assertion-reason)
    - Mains directive word
    - source type: static / partial / current-affairs-driven
    - answer key (Prelims)
  - Tagging is AI-suggested and human-approved.
- **Source Map: "what to read from where"** *(v1.0 · KB-03)*
  - One primary standard source per node (NCERT class + chapter, or standard book + chapter) with a one-line reason.
  - Shown under the naming rule above.
- **PYQ statistics** *(v1.0 · KB-04)*
  - Node frequency and subject weightage are computed from the bank itself, because coaching-site numbers disagree.
- **Strategy Knowledge Base** *(v1.0 · KB-05)*
  - Short strategy claims stored internally with source URL + date.
  - AI strategy answers must be grounded in at least one claim or decline.
  - The app shows "Based on N topper accounts" or an official source, never a person or site.
- **Pedagogy Playbooks** *(v1.0 · KB-06)*
  - Anonymous playbooks distilled from the public UPSC teaching patterns of two educators (`.planning/research/PEDAGOGY.md`), refined with the user's own class notes. Never attributed in the app.

  | Playbook | Behaviour | Release |
  |---|---|---|
  | `PB-PYQ` | PYQ-first Learn sessions | v1.0 |
  | `PB-WHERE` | Point to where to look, then explain after the learner's attempt | v1.0 |
  | `PB-MISTAKE` | Mistakes notebook | v1.0 |
  | `PB-HEAT` | Memory heatmap | v1.0 (× likelihood in v1.1) |
  | `PB-FOCUS` | Designed focus + well-being check-in | v1.0 |
  | `PB-SWITCH` | Phase switch | v1.0 |
  | `PB-CA-LINK` | Static ↔ current-affairs link | v1.0 |
  | `PB-ELIM` | Elimination trainer | v1.1 |
  | `PB-MAP` | Layered map mode | v1.1 |
  | `PB-DEMAND` | Question-demand decoder | v1.2 |
  | `PB-THEME` | Mains theme bank | v1.2 |

- **Review tooling and naming guard** *(v1.0 · KB-07, KB-08)*
  - An admin path to approve or correct tags and source mappings.
  - The blocked-names filter on all client-facing text.
- **Learner Profile** *(v1.0 · PROF-01, PROF-02)*
  - Exam target, weekday availability, work/quiet hours, per-subject level (self-rated, then measured by a ~20-question diagnostic).
  - Learning-pattern strength profile, nudge tone, notification settings, chosen optional, service preferences (v1.2).

### 1. Algorithmic features

**1.1 Scheduling: the planner** *(v1.0 · SCHED-01..05, PED-01, PED-04)*
- **Plan shape:** a **weekly plan** plus a **time-boxed daily to-do** that fits each day's available minutes.
- **Task types:**
  - v1.0: *Learn / Revise / Practice (PYQ, MCQ) / Current Affairs*
  - v1.1 adds *Test*
  - v1.2 adds *Answer-writing*
- **Backward planning** from Prelims (23 May 2027): first pass of the syllabus by ~15 Feb 2027, ≥3 revision cycles, mock cadence (from v1.1).
- **Phases and time ratios** (`PB-SWITCH`), switching automatically:

  | Phase | When | Learn / Revise / CA / Practice |
  |---|---|---|
  | Foundation | Nov–Jan | ≈ 50 / 20 / 15 / 15 |
  | Prelims-intensive | Feb–May | ≈ 15 / 40 / 15 / 30 |
  | Mains mode | after Prelims | v1.2 |

- **Allocation:**
  1. Reserve revision (due reviews), CA and practice time first.
  2. Fill Learn time greedily by `priority × (1 − mastery) ÷ minutes`, respecting prerequisites and ≤2 subjects per day for a working aspirant.
  3. **Priority** is PYQ frequency + syllabus weight in v1.0; from v1.1 the topic-likelihood score (1.4) is added.
- **Learn tasks follow `PB-PYQ`:**
  1. 2–3 PYQs on the node ("this is how it's asked")
  2. the source + chapter
  3. a 3–5 question retrieval check right after
- **Designed focus (`PB-FOCUS`):** one task per session, each with a concrete goal line ("Finish Ch 22 + 5 PYQs").
- **Nightly rebalance:** missed tasks are re-queued by priority, never silently dropped. The user sees what moved and why.
- **Quick replan:** "I only have N minutes today" trims the day to the highest-yield items.

**1.2 Reminders** *(v1.0 · NOTIF-01, NOTIF-02; v1.1 · NOTIF-03)*
- **App push only** (FCM via Expo); no WhatsApp or email.
- v1.0 triggers: plan ready, due reviews, CA quiz, streak at risk. v1.1 adds mock-test reminders.
- Respects work and quiet hours. The user configures each type, its time, and the nudge tone.
- v1.1 learns each user's best send time from open/completion history (per-hour bandit).

**1.3 Algorithms: memory and mastery** *(v1.0 · SRS-01..03, PED-02, PED-03; v1.1 · SRS-04)*
- **FSRS spaced repetition** for flashcards and node-level revision units, target retention 0.9. Per-user parameter fitting after ~1,000 reviews (v1.1).
- **Node mastery model** from review grades, MCQ accuracy and time decay. It drives the planner and the **memory heatmap** (`PB-HEAT`: mastery in v1.0, mastery × likelihood from v1.1).
- **Mistakes notebook** (`PB-MISTAKE`): every wrong answer is logged with a one-tap cause (*didn't know / misread / eliminated wrong / guessed*), becomes an SRS card, and appears in a monthly "recurring traps" summary.
- **Revision guarantee:** every studied node gets ≥3 revision touches before Prelims.

**1.4 Topic prediction** *(v1.1 · PRED-01..04; method in `.planning/research/TOPIC-PREDICTION.md`)*
- **Approach:** encodes the method expert UPSC coaches use, but measured instead of asserted.
- **Signals per (node, exam year):**
  - weighted PYQ frequency (last 15 years, ~5-year half-life)
  - gap vs. the node's typical recurrence ("due" signal)
  - subject-share trend
  - current-affairs salience (last 12–18 months)
  - news triggers: new Acts (≤2 yrs), Supreme Court judgments, report/index releases, summits, "first / largest / newly notified" language
  - 25/50/75/100-year anniversaries
  - Budget / Economic Survey presence
  - static-anchor flag
  - Mains directive mix and long-unasked syllabus lines
- **Model:** logistic regression over node-year rows. Gradient boosting is used only if it beats logistic regression on the backtest.
- **Backtest:** train on 2011–2021, rolling test on 2022–2026, no data leakage.
  - Metrics: top-k coverage, precision@k, Brier score, lift over a frequency-only baseline.
  - **Ships only if it beats the baseline in ≥4 of 5 test years.**
- **Output:**
  - High / Medium / Low likelihood bands with ≤3 plain reasons.
  - The score feeds scheduler priority.
  - **UPSC-format practice questions are generated for High-band topics**, verified like CA questions.
  - The backtest's headline coverage is shown in the app.
  - It never says "this will come".

### 2. AI features

**2.1 Current Affairs Questionnaire** *(v1.0 · CA-01..06)*
- **Daily job at 05:30 IST:**
  1. Ingest PIB, PRS, ministry/RBI/SEBI releases and user-shared links.
  2. Deduplicate.
  3. Write a UPSC-angle summary (newspapers summarised and linked, never republished).
  4. Map to syllabus nodes (`PB-CA-LINK`: every CA item opens its static node, and every node shows its recent CA).
- **Daily quiz:** 5–10 MCQs in real UPSC formats (statement-based, "how many of the above", match-the-pair) with an explanation and an official source.
- **Mains prompts:** one per week per hot topic, answered in the app from v1.2.
- **Verifier:** a second model pass checks for a single correct answer, grounding and ambiguity. Failures are dropped.
- **Feedback loop:** wrong answers go into the mistakes notebook, SRS and mastery. Monthly CA revision compilations are built from the items.

**2.2 Personalised Nudges on To-Do** *(v1.0 · NUDGE-01..03)*
- **When:** a rule engine decides when and whether to nudge: ≤3 per day, triggered by a slipping subject, streak at risk, approaching deadline or long idle time.
- **Words:** Gemini writes them in the user's chosen tone (calm / firm / cheerful; default calm). Push only.
- **Weekly coach note** every Sunday: what was kept, what slipped, one concrete change.
- **Weekly well-being check-in** (`PB-FOCUS`): if strain is reported, next week's planned load is reduced.

**2.3 Optional Discovery: helping aspirants choose their optional** *(v1.0 · OPT-01..05; research in `.planning/research/OPTIONAL-SELECTION.md`)*

Choosing the optional is one of the hardest early decisions: it carries 500 of 1750 Mains marks, there are ~48 choices, and advice is noisy ("scoring optional", "everyone takes X"). The most common mistake is following toppers or peers instead of checking personal fit. Shivanshi must decide by **15 Dec 2026**. Three parts (no taster test):

- **Fit Quiz → ranking across all ~48 optionals** (~10 min).
  - Asks about: degree/background, subjects enjoyed, reading taste (theory / data / narratives / debates), preferred answer style (analytical / factual / diagrams / numericals), hours available before Mains, language comfort (literature optionals), risk appetite.
  - Transparent fit score: `0.30 interest + 0.20 background + 0.15 GS/Essay overlap + 0.10 writing-style fit + 0.10 materials + 0.10 time feasibility + 0.05 scoring stability`. Weights are config, reviewable by a UPSC subject expert, and shown behind `Why?`.
  - Output: a ranked top 5 with one-line reasons, plus "surprising fits" outside the user's background.
- **Explorer & Compare.** One page per optional:
  - syllabus size and estimated hours (from the syllabus graph)
  - **GS/Essay overlap %** (from node similarity)
  - PYQ style mix
  - **multi-year success rate** from official UPSC Annual Reports (appeared → recommended, pooled across years, Wilson confidence band, small-sample warning)
  - standard books (titles only), typical prep time, the user's fit

  Any 2–3 optionals can be compared side by side.
- **Decision Coach** (Gemini, conversational).
  - Answers doubts from the evidence ("I'm an engineer, can I take Sociology?").
  - Runs stress tests ("could you spend 350 hours on this syllabus?", "write 3 lines on this PYQ", "what would make you regret this?").
  - Busts myths with data.
  - Sets the decision deadline and nudges toward it.
- **Decision:** the choice and reasons are saved to the profile. The optional's nodes join the plan with a coverage outline. If the choice is made before the planner ships, it is applied as soon as the planner is live.

**2.4 Evaluation, Review and Reports**
- **v1.0 (in Phase 4):** daily summary and the memory heatmap.
- **v1.1 Prelims** (EVAL-01..03, PED-05):
  - mock and sectional tests with negative marking
  - analytics: accuracy by node, attempt-vs-accuracy curve ("you lose marks beyond ~N attempts"), time per question, mistake causes
  - **elimination trainer** (`PB-ELIM`): mark which statements you eliminated and why, with every wrong option explained
  - weekly report: planned vs. done, coverage, heatmap, retention, mock trend
  - **Prelims readiness score** with a projected range
- **v1.2 Mains** (MAINS-01, MAINS-02, PED-07, PED-08):
  1. The answer comes in as a **photo of handwriting (default) or typed**.
  2. Gemini reads the handwriting.
  3. The **question-demand decoder** (`PB-DEMAND`) checks core theme + directive + dimensions.
  4. A rubric scores: demand met, structure, content vs. model outline, examples/data, diagrams, word limit.
  5. The user gets feedback and an improved outline.
  - Scoring is calibrated against human-graded samples.
  - **Mains theme bank** (`PB-THEME`): reusable value-add cards (data, examples, reports, judgments, committee recommendations) per recurring theme.

**2.5 Learning Pattern Test: find how each aspirant learns best** *(v1.0 · LPT-01..03; research in `.planning/research/LEARNING-PATTERNS.md`)*

Helps every aspirant discover their learning pattern, so Koach can give them methods that suit it.

- **Patterns scored:** **Visual · Auditory · Reading/Writing · Kinesthetic** (senses only; methods follow by fixed mapping in 2.6).
- **Format:** ~15 minutes in onboarding. Four short games with UPSC-flavoured content, matched in difficulty and played in random order, then a **delayed recall round** at the end (long-term retention matters most for UPSC):

  | Pattern | Game | How it's scored |
  |---|---|---|
  | **Visual** | *Map Pins*: 6–8 places shown on a map for 20s, then placed back from memory. *Pattern Grid*: recreate a growing grid of shaded cells | Pin distance error; longest grid recreated |
  | **Auditory** | *Listen & Recall*: a short recording (a list, then a 2-sentence fact) plays **once**; type it or say it back (speech-to-text) | Words / idea units recalled; span reached |
  | **Reading/Writing** | *Read & Write Back*: read a ~120-word passage for 60s, then write the key points from memory | Idea units recalled (Gemini-scored against a key) |
  | **Kinesthetic** | *Arrange & Trace*: sort event cards into order and trace a river by finger while learning, then redo both from memory | Order and trace accuracy |

- **Score:** each pattern 0–100 = `0.6 × immediate + 0.4 × delayed`, normalised across games.
- **Result: a strength profile, not a label.** For example `Visual 82 · Auditory 64 · Reading/Writing 71 · Kinesthetic 58`, with one line ("Pictures and places stick best for you. We'll lead with them.").
- **Keeps testing:** every cue served is tagged with its pattern, and later recall on it (FSRS grades, quiz accuracy) updates the scores. A retest is offered every ~8 weeks.
- **Why a profile and not a label:** people really do differ in visual vs. verbal memory, but teaching *only* in one "style" isn't proven to help. So Koach leads with strengths and keeps a mix (2.6), and measured recall decides over time.

**2.6 Memory Cues Generation: methods chosen from the learning pattern** *(v1.0 · CUE-01..08; v1.2 · CUE-09)*

Cues are generated for any syllabus node, flashcard or CA item. The default format follows the strength profile in a mix of about **60% strongest pattern / 25% second / 15% others**. Users can switch formats and rate cues 👍/👎.

| Pattern | Methods Koach generates |
|---|---|
| **Visual** | **Memory palace**: set up once from a familiar place, syllabus areas assigned to rooms, vivid placements per fact. Also mind-map, timeline and colour-coded one-page cue sheets. *(v1.1: map mode, `PB-MAP`, with layered blank maps, tap-to-locate drills and a monthly places-in-news map. v1.2: generated images for palace placements)* |
| **Auditory** | **Spoken cue sheets** and **rhythmic chants / short rhymes** as text-to-speech audio, verbal **mnemonics** (acronym stories), listen-and-repeat drills, and a background **audio revision playlist** for commutes. No generated music |
| **Reading/Writing** | **One-page cue sheets** (≤12 lines), cloze cards, **write-from-memory** ("blurting") drills scored against key points, 3-line summaries |
| **Kinesthetic** | Drag-to-sequence drills (timelines, processes), build-the-flowchart, trace-on-map drills, teach-back prompts |
| **Everyone** | **Repetition** via FSRS flashcards and cloze; a **first-principles "why"** in 3–5 causal steps (e.g. why Money Bills originate only in Lok Sabha), shown after the learner's own attempt (`PB-WHERE`), with a one-line graded teach-back |

Every mnemonic, chant and rhyme is automatically checked to decode back to the exact facts before it is shown.

**2.7 Service Preference Advisor** *(v1.2 · SVC-01..03)*
- Helps rank services (IAS, IFS, IPS, IRS, etc.) and cadre preferences for DAF-I, which is filled after the Prelims result.
- **Inputs:**
  - values and interests (field administration, diplomacy, policing, finance, …)
  - home-state and cadre considerations
  - eligibility and physical requirements where relevant
  - an indicative rank range from the user's score trends
- **Evidence:** previous years' service allocation by rank and category (UPSC/DoPT published lists) and the current DoPT cadre allocation policy.
- It explains trade-offs. The final order is the user's decision.

## Requirements

### Validated

(None yet — ship to validate)

### Active

All Active items are hypotheses until shipped. IDs are in `.planning/REQUIREMENTS.md`.

- [ ] Platform: monorepo, GCP bootstrap, Cloud SQL, Vertex + speech wrappers, auth, `deploy.yaml`, app on device (PLAT, AUTH)
- [ ] Knowledge base: syllabus graph (incl. optional syllabi), PYQ bank, source map, PYQ statistics, strategy KB, pedagogy playbooks, review tooling, naming guard (KB)
- [ ] Onboarding and diagnostic (PROF)
- [ ] Learning Pattern Test → strength profile, continuously updated (LPT)
- [ ] Planner with PYQ-first Learn tasks, phase switch, nightly rebalance, quick replan (SCHED, PED-01, PED-04)
- [ ] FSRS revision, mastery, mistakes notebook, heatmap, ≥3-revision guarantee (SRS, PED-02, PED-03)
- [ ] Push reminders with quiet hours and per-type settings (NOTIF)
- [ ] Daily CA pipeline → node-mapped, verified UPSC-style MCQs with official sources (CA)
- [ ] Memory cues by pattern, plus repetition and first-principles for everyone (CUE)
- [ ] Nudges, weekly coach note, well-being check-in (NUDGE)
- [ ] Optional Discovery: fit quiz, explorer & compare, decision coach (OPT)
- [ ] v1.1: topic prediction, mocks and analytics, elimination trainer, map mode, CSAT, adaptive tuning (PRED, EVAL, PED-05, PED-06, CSAT, NOTIF-03, SRS-04)
- [ ] v1.2: Mains evaluation, demand decoder, theme bank, Mains mode, essay/ethics, palace images, Service Preference Advisor (MAINS, PED-07, PED-08, CUE-09, SVC)

### Out of Scope

- Naming teachers, coaching institutes, apps, platforms, channels or courses anywhere in the app — user rule; pedagogy is encoded as anonymous playbooks
- Reusing educators' lecture content or notes — only teaching *patterns* are encoded
- Hosting copyrighted book or newspaper text — link + summarise; books referenced by title + chapter
- Labelling a learner as a single "type" or teaching in only one modality — evidence is weak; strength profile + mix + measurement instead
- Optional taster test / taster week — user choice
- AI-generated music for cues — user choice; spoken chants via text-to-speech instead
- WhatsApp or email nudges — user choice; app push only
- A "guaranteed" predicted paper — predictions are likelihood bands with reasons
- Live classes / video lectures — the core value is direction and retention, not more content
- Social feed / community chat — distraction in an attempt year; revisit after launch
- Payments / subscriptions before v2.0 — no monetisation until after dogfooding through Prelims 2027
- Hindi and other mediums before v2.0 — English flows validated first
- Web app — mobile first; admin tooling stays internal
- Non-Google AI providers — constraint: AI runs on Vertex AI, speech on Google Cloud

## Context

- **Exam calendar (UPSC Calendar 2027, released 20 May 2026):** CSE notification 13 Jan 2027; **Prelims 23 May 2027**; Mains from 20 Aug 2027. ~199 days to Prelims from project start (5 Nov 2026). DAF-I is filled after the Prelims result.
- **Dogfood user:** Shivanshi — working, 3–5 study hrs/day, static syllabus partly covered, no structured revision or answer writing yet, optional **not decided** (deadline 15 Dec 2026). She says repetition and first-principles explanations help her remember; both are built in for every learner (FSRS and the "why" cue).
- **Topic prediction research:** expert coaches use a five-signal judgment method (PYQ frequency, recurrence gap, static↔current linkage, news triggers, anniversaries), but none publish backtests. Koach encodes these signals and measures them.
- **Pedagogy research:** two UPSC educators (a PYQ-centric, active-recall GS/Mains mentor and a map-first visual geography teacher) share five patterns: PYQs decide depth, learn → retrieve → space, explain the why, link static to current, log mistakes. Their written public material is thin; the user's class notes will refine the playbooks.
- **Learning-pattern research:** modality-specific memory differences are measurable (visual span vs. verbal span tasks). "Teach only in your style" (meshing) is not supported. The memory palace has medium-to-large effects in meta-analyses.
- **Optional-selection research:** the guidance converges on interest > background > GS overlap > materials, with scoring trends as a check. Third-party success-rate tables contradict each other, so official UPSC Annual Reports are used.
- **Content sources:** PIB, PRS, ministry/RBI/SEBI releases, UPSC Annual Reports, official question papers, DoPT service allocation data. Newspapers are linked and summarised.
- **Tooling:** planned and executed with GSD Core 1.20.0 (installed globally) in YOLO mode.

## Constraints

- **Tech stack**: React Native (Expo) + TypeScript for mobile; TypeScript (Node 24 LTS, Fastify) backend — user requirement, one language end to end; Node 22 reaches end of life before Mains 2027
- **Sign-in**: Google + 6-digit email code (Firebase Auth; email codes minted as Firebase custom tokens, sent via Resend, a non-AI third-party email service); Android first, iOS (and Sign in with Apple) later
- **Cloud**: GCP (Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Cloud Scheduler, Secret Manager, Artifact Registry, Cloud Build); region `asia-south1` — user requirement + India data residency
- **AI**: Vertex AI for all AI features (Gemini Flash/Pro, Gemini embeddings, grounding; Imagen in v1.2). Speech via Google Cloud Text-to-Speech and Speech-to-Text (Chirp) — user requirement
- **Deploy**: `deploy.yaml` (Cloud Build) is the deploy entrypoint — user requirement
- **Timeline**: v1.0 on Shivanshi's phone by ~3 Dec 2026; the product must never delay her own Prelims preparation
- **Budget**: scale-to-zero infrastructure; AI + speech spend < ~US$2 per active user per month
- **Privacy**: DPDP Act 2023 aligned (consent, export/delete, minimal PII, India region); voice recordings and answer photos are private to the user
- **Notifications**: app push only
- **Design**: minimal, low-text UI in the Light Academia theme; light mode default, optional "Lamplight" dark mode; `docs/UI_SPEC.md` is binding
- **GCP**: no project exists yet; Phase 1 includes project/API/IAM bootstrap

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build multi-user from day one, dogfood on Shivanshi first | Avoids a rewrite for public launch; keeps v1 tuned to a real learner | — Pending |
| Target CSE 2027 (Prelims 23 May 2027) | User's attempt; drives Prelims-first prioritisation | — Pending |
| Expo (managed) React Native | Fastest TS path to iOS + Android, managed push, OTA updates | — Pending |
| Cloud SQL Postgres + pgvector over Firestore | Relational planning/analytics/graph queries; no separate vector DB | — Pending |
| Fastify API + Cloud Run Jobs for pipelines | Scale-to-zero containers for API and batch alike | — Pending |
| FSRS for spaced repetition | Better evidenced than SM-2; per-user fitting later | — Pending |
| Rules decide, LLM writes | Explainable, testable, never blocked by an AI outage | — Pending |
| v1.0 priority = PYQ frequency + syllabus weight; topic likelihood added in v1.1 | Ships the planner without waiting for the prediction backtest | — Pending |
| Learning Pattern Test: four sense patterns via games + delayed recall; strength profile, not a label | User choice; modality differences are measurable but style-only teaching isn't proven, so lead with strengths, keep a mix, keep measuring | — Pending |
| Methods follow patterns by fixed mapping; FSRS repetition + first-principles for everyone | User choice (senses only); her stated preference for repetition and "why" is served for everyone | — Pending |
| Audio cues via Cloud Text-to-Speech; no generated music | User choice; cheap and reliable | — Pending |
| Optional Discovery = fit quiz + explorer & compare + decision coach; no taster; in v1.0 | User choice; optional must be decided by 15 Dec 2026 and is a top pain point | — Pending |
| Optional success rates only from official UPSC Annual Reports, pooled with confidence bands | Third-party tables contradict each other; small samples mislead | — Pending |
| Topic prediction = expert five-signal method + logistic model, backtested 2022–2026; ships only if it beats the frequency baseline | Coaches' predictions are unmeasured; Koach must prove lift | — Pending |
| Prediction output = likelihood bands + reasons + practice questions for High-band topics | User choice; useful without overclaiming | — Pending |
| Pedagogy encoded as anonymous playbooks from two educators' public patterns + user's class notes | User choice; UPSC-specific; patterns only | — Pending |
| Naming rule: no people/brands in the app; books and official sources allowed; institute-titled books get neutral labels | User choice; keeps "what to read from where" working | — Pending |
| App push only for nudges and reminders | User choice | — Pending |
| Mains answers by handwriting photo (default) or typed | User choice; photo matches the real exam | — Pending |
| Service Preference Advisor in v1.2, before DAF-I | User request; DAF-I is filled after Prelims | — Pending |
| Link + summarise news; books referenced by title/chapter | Copyright safety | — Pending |
| Region asia-south1 | Latency + DPDP data residency | — Pending |
| Light Academia design system: Cormorant Garamond + Literata, Phosphor Light icons, 4 tabs (Today / Revise / Library / You) | User's aesthetic; calm and scholarly; one primary action per screen | — Pending |
| Android first (EAS dev build); iOS later | User's device; avoids Apple developer account until needed | — Pending |
| Sign-in = Google + 6-digit email code via Firebase custom tokens; email via Resend | User choice; Firebase email links depended on the retired Dynamic Links | — Pending |
| Node 24 LTS; Expo SDK 58; Postgres 16; Gemini `gemini-3.8-flash` / `gemini-3.5-flash-lite` / `gemini-embedding-2` | Current stable versions at Phase 1 planning (2026-11-06); model IDs live only in config | — Pending |
| Phase 1 builds koach-dev only; koach-prod via the same scripts before v1.0; ₹2,000 budget alert | User choice; halves idle cost while dogfooding | — Pending |
| GSD in YOLO mode, standard granularity | User preference; fast iteration toward a 4-week MVP | — Pending |
| Build the platform first and test on web + localhost; the Android build (01-07) and device check wait until the product is further along | User choice (2026-11-06): faster iteration, no device/build loop; Expo web runs the same screens | — Pending |

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
*Last updated: 2026-11-05 after full consistency review of all planning documents*
