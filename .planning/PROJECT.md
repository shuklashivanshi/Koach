# Koach

## What This Is

Koach is a mobile-first (React Native + TypeScript) AI coach for the UPSC Civil Services Exam. It decides what to study, revise and practise each day and where to read it from. It connects current affairs to the static syllabus, predicts likely topics from past-paper analysis, and turns material into memory cues (repetition, memory palace, mnemonics, first-principles explanations) tuned to how the individual learner actually retains information. Its teaching follows proven UPSC pedagogy patterns: PYQ-first learning, active recall, map-based visual learning and mistake logs. It is built first for Shivanshi's own CSE 2027 attempt (working, 3–5 hrs/day) and designed multi-user so it can later serve UPSC aspirants broadly.

## Core Value

Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data (official syllabus, PYQs, measured recall). If everything else fails, the daily plan + spaced-revision engine must work.

## Business Context

- **Customer**: v1 = Shivanshi (dogfood); later = UPSC CSE aspirants, especially working aspirants with limited hours
- **Revenue model**: None in v1; subscription considered for public launch after Prelims 2027
- **Success metric**: Shivanshi completes ≥85% of planned weekly hours and every Prelims syllabus node gets ≥3 revisions before 23 May 2027
- **Strategy notes**: `docs/PRODUCT_SPEC.md`, `docs/UI_SPEC.md`, `.planning/research/TOPIC-PREDICTION.md`, `.planning/research/PEDAGOGY.md`, `.planning/research/LEARNING-PATTERNS.md`, `.planning/research/OPTIONAL-SELECTION.md`

## Features

The full feature set as requested, grouped as **Algorithmic** (deterministic, testable, explainable) and **AI** (Vertex AI Gemini). The rule throughout: **rules decide, the LLM writes.** No daily plan ever depends on an AI call succeeding.

### Foundations

- **Syllabus Graph.** The official UPSC syllabus (Prelims GS-I, CSAT, Mains GS I–IV, Essay, optional syllabi) broken into ~600–900 atomic nodes. Each node has parent/children, prerequisites, estimated minutes, Prelims/Mains relevance, PYQ history and a primary source + chapter.
- **PYQ Bank.** Prelims GS-I 2011–2026 and Mains GS 2013–2026, each question tagged to nodes with type (statement-based, "how many of the above", match-the-pair, assertion-reason; Mains directive word) and **source type** (static / partial / current-affairs-driven). Tagging is AI-suggested and human-approved.
- **Source Map ("what to read from where").** One primary standard source per node (NCERT class + chapter, standard book + chapter) with a one-line reason. Books are referenced by title and chapter only, and no copyrighted text is stored.
- **Strategy Knowledge Base.** Short, cited strategy claims stored internally with source URL + date. The UI never names teachers, institutes or platforms; it shows "based on N topper accounts" or an official source.
- **Pedagogy Playbooks.** Anonymous playbooks (`PB-PYQ`, `PB-WHERE`, `PB-MISTAKE`, `PB-HEAT`, `PB-FOCUS`, `PB-MAP`, `PB-ELIM`, `PB-THEME`, `PB-DEMAND`, `PB-SWITCH`, `PB-CA-LINK`) distilled from the public teaching patterns of two named UPSC educators. They are refined with the user's own class notes and are never attributed in the UI. See `.planning/research/PEDAGOGY.md`.
- **Learner Profile.** Exam target, weekday availability, work/quiet hours, per-subject level (self-rated, then measured), learning-pattern strength profile, tone preference, notification settings, optional subject, service preferences.

### 1. Algorithmic features

**1.1 Scheduling (planner)**
- Builds a **weekly plan** and a **time-boxed daily to-do** whose tasks are typed *Learn / Revise / Practice (PYQ, MCQ) / Current Affairs / Answer-writing / Test*, fitting each day's available minutes.
- **Backward planning** from Prelims (23 May 2027): first-pass coverage deadline (~15 Feb), ≥3 revision cycles, mock cadence.
- **Phase-based time ratios** with an automatic phase switch (`PB-SWITCH`): Foundation (Nov–Jan) ≈ 50 learn / 20 revise / 15 CA / 15 practice → Prelims-intensive (Feb–May) ≈ 15 / 40 / 15 / 30 → Mains mode after Prelims.
- **Allocation:** reserve SRS reviews, CA and practice first, then fill Learn time greedily by `priority × (1 − mastery) / minutes`, respecting prerequisites and ≤2 subjects/day for a working aspirant.
- **Learn tasks follow `PB-PYQ`:** 2–3 PYQs on the node shown first ("this is how it's asked"), then the source + chapter, then a 3–5 question retrieval check right after.
- **Designed focus (`PB-FOCUS`):** one task per session, each with a concrete goal line ("Finish Ch 22 + 5 PYQs").
- **Nightly rebalance:** missed tasks are re-queued by priority, never silently dropped; the user sees what moved and why.
- **Quick replan:** "I only have N minutes today" trims the day to the highest-yield items.

**1.2 Reminders**
- Push notifications (FCM via Expo) for: plan ready, due reviews, CA quiz, streak at risk, mock tests. **App push only** (no WhatsApp/email for now).
- Respects quiet hours and work hours; user-configurable per type.
- v1.1: learns the best send time per user from open/completion history (per-hour bandit).

**1.3 Algorithms (memory and mastery)**
- **FSRS** spaced repetition for flashcards and node-level revision units, target retention 0.9. Per-user parameter fitting after ~1,000 reviews (v1.1).
- **Node mastery model:** updated from review grades, MCQ accuracy and time decay. It drives the planner and the **memory heatmap** (`PB-HEAT`, mastery × likelihood).
- **Mistakes notebook (`PB-MISTAKE`):** every wrong answer is logged with a cause tag (*concept gap / misread / elimination error / guess*), turned into an SRS card, and surfaced as "recurring traps" monthly.
- **Revision guarantee:** every studied node gets ≥3 revision touches before Prelims.

**1.4 Topic prediction** (see `.planning/research/TOPIC-PREDICTION.md`)
- This encodes the method expert coaches use, but measured instead of asserted.
- **Signals per (node, year):**
  - weighted PYQ frequency (last 15 yrs, ~5-yr half-life)
  - gap vs. the node's typical recurrence ("due" signal)
  - subject-share trend
  - current-affairs salience (last 12–18 months)
  - news triggers: new Acts (≤2 yrs), SC judgments, report/index releases, summits, "first/largest/newly notified" language
  - 25/50/75/100-year anniversaries
  - Budget/Economic Survey presence
  - static-anchor flag
  - Mains directive mix and long-unasked syllabus lines
- **Model:** logistic regression over node-year rows (gradient boosting only if it beats this), compared against frequency baselines.
- **Backtest:** train 2011–2021, rolling test 2022–2026, no leakage. Metrics: top-k coverage, precision@k, Brier score, lift. **Ship only if it beats the frequency baseline in ≥4 of 5 years.**
- **Output:** High/Medium/Low likelihood bands with ≤3 plain reasons. The score feeds scheduler priority, and **UPSC-format practice questions are generated for High-band topics** (verified like CA questions). The backtest's headline coverage is shown in-app. It never says "this will come".

### 2. AI features (Vertex AI)

**2.1 Current Affairs Questionnaire**
- **Daily job at 05:30 IST:** ingests PIB, PRS, ministry/RBI/SEBI releases and user-shared links → dedupe → UPSC-angle summary (newspapers summarised and linked, never republished) → mapped to syllabus nodes (`PB-CA-LINK`: every CA item opens its static node, and every node shows its recent CA).
- **Daily questions:** 5–10 MCQs in real UPSC formats with explanation + official source, plus one Mains prompt per week per hot topic.
- **Verifier:** a second-pass model checks for a single correct answer, grounding and ambiguity. Failures are dropped, and users can report errors.
- Wrong answers flow into the mistakes notebook, SRS and mastery. Monthly CA revision compilations are built from the items.

**2.2 Personalised Nudges on To-Do**
- A rule engine decides *when/whether* (≤3/day; triggers: slipping subject, streak at risk, approaching deadline, long idle). Gemini writes the words in the user's chosen tone (calm / firm / cheerful).
- A weekly coach note (kept / slipped / one change) and a weekly well-being check-in (`PB-FOCUS`); if strain is reported, the plan load is reduced for the next week.

**2.3 Optional Discovery: helping aspirants choose their optional** (see `.planning/research/OPTIONAL-SELECTION.md`)

Choosing the optional is one of the hardest early decisions: 500 of 1750 Mains marks, ~48 choices, noisy advice ("scoring optional", "everyone takes X"). The most common mistake is following toppers or peers instead of checking personal fit. Shivanshi must decide by ~15 Dec 2026. Three parts (no taster test):

- **Fit Quiz → ranking across all ~48 optionals (~10 min).**
  - Asks about: degree/background, subjects enjoyed, reading taste (theory / data / narratives / debates), preferred answer style (analytical / factual / diagrams / numericals), hours available before Mains, language comfort (literature optionals), risk appetite.
  - Transparent fit score: `0.30 interest + 0.20 background + 0.15 GS/Essay overlap + 0.10 writing-style fit + 0.10 materials + 0.10 time feasibility + 0.05 scoring stability`. Weights are config, SME-reviewable, and shown behind `Why?`.
  - Output: a top 5 with one-line reasons, plus "surprising fits" outside the user's background.
- **Explorer & Compare.** One page per optional:
  - syllabus size and estimated hours (computed from the syllabus graph)
  - **GS/Essay overlap %** (computed from node similarity)
  - PYQ style mix
  - **multi-year success rate** from UPSC Annual Reports (appeared → recommended, pooled across years, Wilson confidence band, small-sample warning)
  - standard books (titles only), typical prep time, and the user's fit

  Any 2–3 optionals can be compared side by side.
- **Decision Coach (Gemini, conversational).**
  - Answers doubts ("I'm an engineer, can I take Sociology?") from the evidence.
  - Runs stress tests ("could you spend 350 hours on this syllabus?", "write 3 lines on this PYQ", "what would make you regret this?").
  - Busts myths with data and sets and nudges toward a decision deadline.
  - Records the final choice + reasons. The optional's nodes are then added to the plan with a coverage outline.

**2.4 Service Preference Advisor** *(added 2026-11-05)*
- Helps rank services (IAS, IFS, IPS, IRS, etc.) and cadre preferences for DAF-I (filled after Prelims).
- Inputs: values and interests (field administration, diplomacy, policing, finance, …), home-state and cadre considerations, eligibility and physical requirements where relevant, realistic rank range from mock/score trends.
- Evidence: previous years' service allocation by rank/category (UPSC/DoPT published lists) and the current DoPT cadre allocation policy. It explains trade-offs, and the user decides.

**2.5 Evaluation + Review/Reports**
- **Prelims:** mock and sectional tests with negative marking.
- **Analytics:** accuracy by node, attempt-vs-accuracy curve ("you lose marks beyond ~N attempts"), time per question, mistake causes, plus an **elimination trainer** (`PB-ELIM`: mark which statements you eliminated and why, analyse every wrong option).
- **Mains (v1.2):** photo of a handwritten answer (default; typing also allowed) → Gemini multimodal OCR → **question-demand decoder** (`PB-DEMAND`: core theme + directive + dimensions) → rubric score (demand met, structure, content vs. model outline, examples/data, diagrams, word limit) → feedback + improved outline. Calibrated against human-graded samples.
- **Mains theme bank (`PB-THEME`):** reusable value-add cards (data, examples, reports, judgments, committee recommendations) per recurring theme.
- **Reports:** daily summary, weekly report (planned vs. done, coverage, heatmap, retention, mock trend), Prelims readiness score with projected range.

**2.6 Learning Pattern Test: find how each aspirant learns best** (see `.planning/research/LEARNING-PATTERNS.md`)

Helps every aspirant discover their learning pattern, so Koach can give them methods that suit it.

- **Patterns scored:** **Visual · Auditory · Reading/Writing · Kinesthetic** (senses only; methods follow by fixed mapping).
- **Format:** ~15 min in onboarding. Four short games with UPSC-flavoured content, matched in difficulty and played in random order, plus a **delayed recall round** at the end (long-term retention matters most for UPSC):

  | Pattern | Game | How it's scored |
  |---|---|---|
  | **Visual** | *Map Pins*: 6–8 places shown on a map for 20s, placed back from memory. *Pattern Grid*: recreate a growing grid of shaded cells | Pin distance error; longest grid recreated |
  | **Auditory** | *Listen & Recall*: a short recording (a list, then a 2-sentence fact) plays **once**; type it or say it back (speech-to-text) | Words/idea units recalled; span reached |
  | **Reading/Writing** | *Read & Write Back*: read a ~120-word passage for 60s, then write the key points from memory | Idea units recalled (Gemini-scored against a key) |
  | **Kinesthetic** | *Arrange & Trace*: sort event cards into order and trace a river by finger while learning, then redo from memory | Order and trace accuracy |
- **Score:** each pattern 0–100 = `0.6 × immediate + 0.4 × delayed`, normalised across games.
- **Result: a strength profile, not a label.** For example `Visual 82 · Auditory 64 · Reading/Writing 71 · Kinesthetic 58`, with one line ("Pictures and places stick best for you. We'll lead with them.").
- **Keeps testing:** every cue served is tagged with its pattern, and later recall on it (FSRS grades, quiz accuracy) updates the scores. A re-test is offered every ~8 weeks.
- **Why a profile and not a label:** research shows real differences in visual vs. verbal memory, but teaching *only* in one "style" isn't proven to help. So Koach leads with strengths (~60% of cues), keeps a mix (25% second-best, 15% others), and lets measured recall decide over time.

**2.7 Memory Cues Generation: methods chosen from the learning pattern**

Cues are generated for any syllabus node, flashcard or CA item. The default format follows the strength profile, users can switch formats, and they rate cues 👍/👎.

| Pattern | Methods Koach generates |
|---|---|
| **Visual** | **Memory palace**: a personal palace set up once from a familiar place, syllabus areas assigned to rooms, vivid placements per fact. Also mind-map cue sheets, timelines, diagrams, colour-coded one-pagers, image-anchored flashcards. **Map mode** (`PB-MAP`, v1.1): layered blank maps (physiography → rivers → borders → context → PYQ/CA overlay), tap-to-locate drills, monthly places-in-news map |
| **Auditory** | **Spoken cue sheets** (text-to-speech audio per topic), **rhythmic chants and short rhymes** read aloud, verbal **mnemonics** (acronym stories), listen-and-repeat drills, audio revision playlists for commutes. *Generated music deferred* |
| **Reading/Writing** | **Cue sheets** (one-page, ≤12 lines), cloze cards, **write-from-memory** ("blurting") drills, acronym lists, 3-line summaries |
| **Kinesthetic** | Drag-to-sequence games (timelines, processes), trace-on-map drills, build-the-flowchart, handwritten answer practice, teach-back prompts |
| **Everyone** | **Repetition** via FSRS spaced flashcards and cloze for all formats; a **first-principles "why"** (3–5 causal steps, e.g. why Money Bills originate only in Lok Sabha), shown after the learner's own attempt (`PB-WHERE`), with a one-line graded teach-back |

All mnemonics, rhymes and chants are automatically checked to decode back to the exact facts before being shown.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Syllabus graph, PYQ bank (with source-type tags), source map, cited strategy KB, and anonymous pedagogy playbooks
- [ ] Onboarding (target, weekday availability, self-assessment, diagnostic)
- [ ] Learning Pattern Test (visual, auditory, reading/writing, kinesthetic games + delayed recall) → strength profile, continuously updated
- [ ] Scheduler with PYQ-first Learn tasks, phase switch, nightly rebalance, quick replan
- [ ] FSRS revision, mastery model, memory heatmap, mistakes notebook, ≥3-revision guarantee
- [ ] Reminders with quiet hours and per-type settings
- [ ] Daily CA pipeline → node-mapped, verified UPSC-style MCQs with official sources
- [ ] Memory cues by pattern: memory palace and visual sheets; spoken cue sheets, chants and mnemonics; written cue sheets and blurting; sequence/trace drills; plus FSRS repetition and first-principles "why" for everyone
- [ ] Personalised nudges, weekly coach note, well-being check-in
- [ ] Optional Discovery: fit quiz ranking all ~48 optionals, explorer & compare with official success-rate data, decision coach
- [ ] Topic prediction (signals above), backtested, with likelihood bands + practice questions for top topics
- [ ] Prelims mocks, analytics, elimination trainer, weekly reports, readiness score
- [ ] Map mode for geography, environment and places-in-news
- [ ] Mains answer evaluation from handwritten photos, question-demand decoder, theme bank
- [ ] Service Preference Advisor for DAF-I
- [ ] GCP deployment: Cloud Run API + jobs, Cloud SQL Postgres + pgvector, Vertex AI, Cloud Build via `deploy.yaml`

### Out of Scope

- Naming teachers, coaching institutes, apps, channels or courses anywhere in the UI — user rule; pedagogy is encoded as anonymous playbooks
- Reusing educators' lecture content or notes — only teaching *patterns* are encoded, never their material
- Hosting copyrighted book or newspaper text — link + summarise; books referenced by title + chapter
- Live classes / video lectures — the core value is direction and retention, not more content
- Social feed / community chat — distraction in an attempt year; revisit post-launch
- Payments / subscriptions — no monetisation until after dogfooding through Prelims 2027
- Hindi and other mediums — v2
- Web app — mobile first; admin tooling stays internal
- Non-Vertex AI providers — constraint: all AI on GCP Vertex AI
- A "guaranteed" predicted paper — predictions are likelihood bands with reasons, never certainties

## Context

- **Exam calendar (UPSC Calendar 2027, released 20 May 2026):** CSE notification 13 Jan 2027; **Prelims 23 May 2027**; Mains from 20 Aug 2027. ~199 days to Prelims from project start (5 Nov 2026). DAF-I is filled after the Prelims result, which is when the Service Preference Advisor is needed.
- **Learner (dogfood user):** Shivanshi — working, 3–5 study hrs/day, static syllabus partly covered, no structured revision or answer writing yet, optional subject **not decided** (decide by ~15 Dec 2026). Self-reports that repetition and first-principles explanations help her remember, which Koach verifies by measurement.
- **Topic prediction research:** expert coaches use a five-signal judgment method (PYQ frequency, recurrence gap, static↔current linkage, news triggers, anniversaries), but none publish backtests. Koach encodes these signals and measures them.
- **Pedagogy research:** two UPSC educators (a PYQ-centric, active-recall Mains/GS mentor and a map-first visual geography teacher) share five patterns: PYQs drive depth, learn → retrieve → space, explain the why, link static to current, log mistakes. Public written material is thin; the user's class notes will refine it.
- **Evidence posture:** retention is measured per cue type rather than assumed. FSRS is preferred to SM-2. Subject weightage is computed from the official papers, because coaching-site numbers disagree.
- **Content sources:** PIB, PRS, ministry/RBI releases, UPSC annual reports, official question papers, DoPT service allocation data. Newspapers are linked and summarised.
- **Tooling:** planned and executed with GSD Core 1.20.0 (global) in YOLO mode.

## Constraints

- **Tech stack**: React Native (Expo) + TypeScript for mobile; TypeScript (Node 22, Fastify) backend — user requirement
- **Cloud**: GCP (Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Scheduler, Secret Manager, Artifact Registry, Cloud Build); region `asia-south1` — user requirement + India data residency
- **AI**: All AI features use Vertex AI (Gemini Flash/Pro, Gemini embeddings, grounding; Imagen optional); speech via Google Cloud Text-to-Speech and Speech-to-Text (Chirp) on GCP — user requirement
- **Deploy**: `deploy.yaml` (Cloud Build) is the deploy entrypoint — user requirement
- **Timeline**: v1.0 usable on Shivanshi's phone by ~3 Dec 2026; the product must never delay her own Prelims preparation
- **Budget**: Scale-to-zero infra; Vertex spend < ~US$2 per active user per month
- **Privacy**: DPDP Act 2023 aligned (consent, export/delete, minimal PII, India region)
- **Trust**: Every factual AI output carries an official source; generated questions pass a verifier before being shown
- **Naming**: No teacher, institute, platform, channel or course names in the UI, ever. Standard books, NCERT and official/government sources may be named
- **GCP**: No project exists yet; Phase 1 includes project/API/IAM bootstrap
- **Design**: Minimal, low-text UI in a Light Academia theme (cream/beige/light brown, serif type, sunlight, engravings); light mode default, optional "Lamplight" dark mode. `docs/UI_SPEC.md` is the app-wide design contract

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build multi-user from day one, dogfood on Shivanshi first | Avoids a rewrite for public launch; keeps v1 tuned to a real learner | — Pending |
| Target CSE 2027 (Prelims 23 May 2027) | User's attempt; drives Prelims-first prioritisation | — Pending |
| Expo (managed) React Native | Fastest TS path to iOS + Android, managed push, OTA updates | — Pending |
| Cloud SQL Postgres + pgvector over Firestore | Relational planning/analytics/graph queries; avoids separate vector DB | — Pending |
| Fastify API + Cloud Run Jobs for pipelines | Scale-to-zero, containers for API and batch alike | — Pending |
| FSRS for spaced repetition | Better-evidenced than SM-2; per-user fitting later | — Pending |
| Deterministic scheduler + topic scoring; LLM only for language/content | Explainable, testable, never blocked by an AI outage | — Pending |
| Learning Pattern Test scores Visual / Auditory / Reading-Writing / Kinesthetic via games + delayed recall; shown as a strength profile, not a label | User choice 2026-11-05; modality memory differences are measurable, but style-only teaching isn't proven, so lead with strengths, keep a mix, keep re-measuring | — Pending |
| Methods follow patterns by fixed mapping (visual → memory palace, auditory → spoken cues/chants/mnemonics, reading/writing → cue sheets/blurting, kinesthetic → sequence/trace); FSRS repetition + first-principles for all | User choice 2026-11-05 (senses only) | — Pending |
| Audio cues via Google Cloud Text-to-Speech; no generated music for now | User choice 2026-11-05; cheap, reliable | — Pending |
| Nudges and reminders via app push only | User choice 2026-11-05 | — Pending |
| Mains answers submitted as handwriting photo (default) or typed | User choice 2026-11-05 | — Pending |
| Topic prediction = expert five-signal method + logistic model, backtested 2022–2026 | Coaches' predictions are unmeasured; Koach must prove lift over a frequency baseline | — Pending |
| Prediction output = likelihood bands + reasons + practice questions for top topics | User choice 2026-11-05; useful without overclaiming | — Pending |
| Pedagogy encoded as anonymous playbooks from two named educators' public patterns + user's class notes | User choice 2026-11-05; specific to UPSC; no names in UI; patterns only, no content reuse | — Pending |
| Naming rule: no people/brands in UI; books and official sources allowed | User choice 2026-11-05; keeps "what to read from where" working | — Pending |
| Add Service Preference Advisor (v1.2, before DAF-I) | User request 2026-11-05; DAF-I filled after Prelims | — Pending |
| Optional Discovery (fit quiz + explorer/compare + decision coach, no taster) in v1.0 | User choice 2026-11-05; the optional must be decided by mid-Dec 2026 and is a top pain point for aspirants | — Pending |
| Link + summarise news; books referenced by title/chapter | Copyright safety | — Pending |
| Region asia-south1 | Latency + DPDP data residency | — Pending |
| Light Academia design system: Cormorant Garamond + Literata, Phosphor Light icons, 4 tabs (Today / Revise / Library / You) | User's aesthetic; calm and scholarly; one primary action per screen | — Pending |
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
*Last updated: 2026-11-05 after Learning Pattern Test and Optional Discovery redesign*
