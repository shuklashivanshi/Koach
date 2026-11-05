# Koach — Product Spec Sheet (v0.1)

> A personal UPSC Civil Services coach that knows the exam ecosystem the way a topper-mentor does, and knows *you* the way a good teacher does.

| | |
|---|---|
| **Owner** | Shivanshi Shukla |
| **Status** | Draft for review (planning only, nothing built yet) |
| **Date** | 2026-11-05 |
| **Primary user (v1)** | Shivanshi: CSE 2027, working (3–5 hrs/day), partly prepared, optional not yet chosen |
| **Later users** | UPSC aspirants in general (multi-user from day one, launched publicly after dogfooding) |
| **Platform** | React Native (Expo) + TypeScript mobile app, TypeScript backend on GCP, all AI on Vertex AI |

---

## 1. Problem

UPSC preparation has too much advice and too little guidance that fits the person following it:

1. **Too many approaches.** Every coaching institute, topper blog and Telegram channel prescribes different books, sequences and timelines. Aspirants burn weeks deciding instead of studying.
2. **Static and current affairs drift apart.** Aspirants read the newspaper but never connect it to the syllabus, so it doesn't stick and isn't revised.
3. **Forgetting is the real enemy.** The syllabus is huge. Without planned revision, most material is lost before Prelims. Toppers consistently cite multiple revisions as the deciding factor.
4. **Advice ignores how the individual learns.** Some people retain through repetition, some through first-principles reasoning, some through vivid associations. Generic plans ignore this.
5. **Working aspirants have little time.** With 3–5 hours a day, every hour must go to the highest-yield item.

## 2. Product vision and core value

**Core value:** *Every day, Koach tells me exactly what to study, revise and practise next, and how to make it stick for me, with the reasoning backed by UPSC data.*

If everything else fails, the **daily plan + revision engine** must work: an evidence-based schedule that adapts to missed days and serves revision at the right time in the format that works for this learner.

### Design principles

1. **Data over opinion.** Every recommendation (book, topic priority, time split) carries its evidence: PYQ frequency, official syllabus mapping, or a cited topper/mentor source. No uncited "toppers say".
2. **Measured, not assumed, personalisation.** "Learning styles" as fixed types are not well supported by research. Koach measures what actually improves *your* retention (repetition vs. first principles vs. memory palace vs. mnemonics) through recall tests, and keeps updating that estimate from real review data.
3. **One source per topic.** Koach picks one standard source per syllabus node and defends it. Fewer sources, more revisions.
4. **Opinionated defaults, transparent reasoning.** The coach decides, and explains why when asked.
5. **Honest about uncertainty.** Topic prediction is shown as likelihood with reasoning, never as a guarantee.

## 3. Exam context (ground truth the product encodes)

| Item | Value | Source |
|---|---|---|
| CSE 2027 notification | 13 Jan 2027 (applications close ~2 Feb) | UPSC Calendar 2027 (released 20 May 2026) |
| **Prelims** | **23 May 2027** (GS Paper I + CSAT Paper II, same day) | UPSC Calendar 2027 |
| Mains | From 20 Aug 2027 (5 days) | UPSC Calendar 2027 |
| Days to Prelims from today | ~199 | — |
| Prelims GS-I | 100 Qs, 200 marks, −1/3 negative marking; decides the cut-off | UPSC rules |
| CSAT | Qualifying, 33% | UPSC rules |
| Mains | 9 papers (2 qualifying languages + Essay + GS I–IV + Optional I–II), 1750 marks + 275 interview | UPSC rules |

> The official calendar PDF and notification on upsc.gov.in are the source of truth. Koach re-checks them when the notification releases.

**Strategic implication for Shivanshi (CSE 2027, working, partly prepared):**
- **Nov–Jan:** integrated GS (Prelims + Mains-oriented static reading), daily CA, **decide the optional by mid-December**.
- **Feb–mid-May:** Prelims-dominant mode (static revision cycles, PYQs, mock tests, CA compilation revision, CSAT check).
- **24 May–Aug:** Mains mode (answer writing, optional, essay, ethics).

## 4. Users and personas

**P1: Shivanshi (dogfood user).** Working professional, 3–5 hrs/day, some static subjects done, no structured revision or answer writing yet, optional undecided. Says she remembers better with *repetition* and *first-principles explanations*. Koach should verify that, not just assume it.

**P2 (later): First-attempt full-timer.** 8–10 hrs/day, needs structure and source discipline.

**P3 (later): Repeater.** Has given Prelims before; needs gap analysis from past scores and mock data.

## 5. Feature specification

Features are grouped as requested: **Algorithmic** (deterministic, testable, explainable) and **AI** (Vertex AI / Gemini). Each item lists *what*, *how it decides*, and *v1 scope*.

### 5.0 Foundations (needed by everything)

| Component | Description |
|---|---|
| **Syllabus Graph** | Official UPSC syllabus (Prelims GS-I, CSAT, Mains GS I–IV, Essay, optional syllabi) broken into ~600–900 atomic *nodes* (e.g. *Polity → Parliament → Money Bills*). Each node has: parent/children, prerequisites, PYQ count by year, Prelims/Mains relevance, recommended source + chapter, estimated study minutes. |
| **PYQ Bank** | UPSC Prelims GS-I 2011–2026 and Mains GS 2013–2026 questions (public UPSC papers), each tagged to syllabus nodes, question type (statement-based, match-the-pair, "how many of the above", assertion-reason) and difficulty. Tagging is AI-assisted and human-reviewed. |
| **Source Map ("what to read from where")** | For each node: a primary standard source (e.g. NCERT class/chapter, M. Laxmikanth chapter, Spectrum chapter, Ramesh Singh/Economic Survey chapter, Shankar IAS environment chapter, etc.), an optional secondary source, and the reason. **Koach references books by title and chapter only and does not host copyrighted text.** Users can attach their own notes and PDFs for personal use. |
| **Strategy Knowledge Base** | Curated, *cited* strategy guidance (topper interviews and blogs, UPSC annual reports, official syllabus), stored as short claims with a source URL and date. AI answers about strategy must cite from here (RAG); uncited claims are not shown. |
| **Learner Profile** | Exam target, daily availability per weekday, prep level per subject (self-rated, then measured), learning-pattern strength profile (§5.2.5), notification preferences, tone preference. |

### 5.1 Algorithmic features

#### 5.1.1 Scheduling (the planner)
- **Inputs:** days to exam, phase (Foundation / Prelims-intensive / Mains), per-weekday available minutes, syllabus-node priority (§5.1.4), mastery per node, prerequisites, SRS due load (§5.1.3), CA backlog, test calendar.
- **Output:** a **weekly plan** (subject blocks) and a **daily to-do** of time-boxed tasks typed as *Learn*, *Revise*, *Practice (PYQ/MCQ)*, *Current Affairs*, *Answer-writing*, *Test*.
- **Algorithm (v1):** a deterministic constraint-based allocator:
  1. Reserve fixed slots: SRS reviews (capped), daily CA (30–45 min), and practice. Ratios depend on phase, e.g. Foundation ≈ 50 learn / 20 revise / 15 CA / 15 practice; Prelims-intensive ≈ 15 / 40 / 15 / 30.
  2. Fill learn time by greedy selection over nodes ordered by `priority × (1 − mastery) / est_minutes`, respecting prerequisites, a subject-rotation rule (≤2 subjects/day for a working aspirant) and a whole-syllabus coverage deadline (e.g. first pass done by 15 Feb).
  3. **Rebalance nightly:** missed tasks are re-queued by priority, never silently dropped. If load exceeds capacity, lowest-yield learn items are deferred first, and the user is told what was deferred and why.
- **Backward planning:** milestones are computed back from 23 May 2027 (first pass done, revision cycles 1/2/3, mock test cadence).
- **v1:** weekly + daily plan, nightly rebalance, "I have only 1 hour today" quick replan.

#### 5.1.2 Reminders
- Push notifications (FCM via Expo) for: daily plan ready, due reviews, CA quiz, streak at risk, scheduled mock test.
- Respect quiet hours and work hours. In v1.1, learn the best send time from open/completion history (simple per-hour success-rate bandit).
- **v1:** fixed-time reminders + quiet hours + due-review reminder.

#### 5.1.3 Algorithms: spaced repetition and mastery
- **FSRS (Free Spaced Repetition Scheduler)** for flashcards and "revision units" (a node-level revision task, not just cards). FSRS models stability and difficulty per item and outperforms SM-2 on large public review datasets. Default parameters at first; per-user parameter optimisation once ~1,000 reviews exist.
- **Mastery estimate per node:** Bayesian-style update from MCQ accuracy, review grades and recency (decays over time), so the planner always works from a current "what do I actually know" map.
- **Revision cycles:** Koach makes sure every studied node gets ≥3 revisions before Prelims, which matches the near-universal topper advice of multiple revisions of limited sources.

#### 5.1.4 Topic prediction (priority scoring)
- **Goal:** rank syllabus nodes by how likely they are to be asked, to drive priority, not to promise questions.
- **Signals:**
  - PYQ frequency (weighted, recent years weighted higher)
  - recurrence cycles (topics that return every N years)
  - **current-affairs salience** (how much news in the last 12–18 months maps to the node: anniversaries, new laws, schemes, reports, international events, environment conventions)
  - official-document salience (Budget, Economic Survey, new Acts)
  - "static anchor" topics that UPSC asks consistently
- **Model (v1):** transparent weighted score, with weights tuned by **backtesting**: train on 2011–2021, test on 2022–2026 Prelims, and report the precision of the top-k nodes against the questions that actually appeared. Shown in the app as "High / Medium / Low likelihood" with the reasons ("asked in 6 of the last 10 years; in the news since March").
- **v1.1:** gradient-boosted model if backtest shows real lift over the weighted score.

### 5.2 AI features (Vertex AI)

All prompts, model IDs and parameters are config-driven. Default model routing: a **Gemini Flash-class** model for high-volume work (MCQ generation, nudges, tagging) and a **Gemini Pro-class** model for evaluation, elective reasoning and first-principles explanations, using the latest GA versions on Vertex at build time (re-checked against the Vertex model-versions page). Embeddings: Vertex **Gemini embedding** model. Current-affairs fact checking uses **Vertex AI grounding** (Google Search grounding + our curated sources). Every AI output that states facts carries source links.

#### 5.2.1 Current Affairs Questionnaire
- **Ingestion (daily Cloud Run job):** PIB press releases (RSS), PRS Legislative Research, government ministry and RBI/SEBI releases, Sansad TV / AIR summaries where licensed, plus user-forwarded article links. Newspaper articles are **summarised with a link to the original, never republished**.
- **Pipeline:** dedupe → summarise (UPSC-relevant angle only) → **map to syllabus nodes** (embedding + LLM classifier) → generate:
  - 5–10 **UPSC-style Prelims MCQs/day** (statement-based, "how many of the above", match-the-following) with explanations and sources
  - 1 Mains-style question/week per hot topic
- **Quality gates:** each MCQ is self-checked by a second model pass for single correct answer, factual grounding and no ambiguity; failed items are dropped.
- Wrong answers feed into SRS cards and node mastery; CA items appear in monthly revision compilations.

#### 5.2.2 Personalised nudges on to-do
- LLM-written nudges built from: today's plan and progress, streaks, slipping subjects, upcoming deadlines (e.g. "first pass of Economy due in 9 days"), and the learner's preferred tone (calm / firm / cheerful).
- Rules decide **when** and **whether** to nudge (deterministic, rate-limited to ≤3/day). The LLM only writes the **words**.
- Weekly "coach note": what went well, what slipped, one concrete change.

#### 5.2.3 Optional Discovery
Helps aspirants choose their optional, a major pain point:
- **Fit Quiz:** ranks all ~48 optionals with reasons.
- **Explorer & Compare:** syllabus size, GS/Essay overlap, official multi-year success rates with confidence bands, standard books, prep time.
- **Decision Coach:** doubts, stress tests, myth-busting, decision deadline.
- No taster test.

Full detail: `.planning/PROJECT.md` §2.3 and `.planning/research/OPTIONAL-SELECTION.md`.

#### 5.2.4 Evaluation, review and reports
- **Prelims tests:** in-app mock and sectional tests (PYQ-based + generated). Analytics: accuracy by subject and node, negative-marking analysis (attempt-vs-accuracy curve: "you lose marks beyond ~85 attempts"), time per question, silly-mistake tagging.
- **Mains answer evaluation (v1.1):** user photographs a handwritten answer → Gemini multimodal OCR → rubric scoring (understands the demand of the question, structure, intro/body/conclusion, content coverage vs. a model-answer outline, examples and data, diagrams, word limit) → actionable feedback + an improved outline. Calibrated against a small set of human-evaluated answers.
- **Reports:** daily summary, weekly report (hours planned vs. done, coverage %, mastery heatmap, retention curve, mock trend), and a Prelims readiness score with a projected range.

#### 5.2.5 Learning Pattern Test
~15 min of games scoring **Visual** (map pins, pattern grid), **Auditory** (listen to a recording, then write or say it back), **Reading/Writing** (read, then write back key points) and **Kinesthetic** (arrange and trace), plus delayed recall. The result is a **strength profile** (four 0–100 scores), continuously updated from real recall.

#### 5.2.6 Memory Cues Generation
Methods follow the profile:
- **Visual:** memory palace, mind-maps, timelines, map mode
- **Auditory:** spoken cue sheets (TTS), chants, rhymes, mnemonics, audio playlists
- **Reading/Writing:** one-page cue sheets, blurting
- **Kinesthetic:** sequence and flowchart drills
- **Everyone:** FSRS repetition and first-principles "why"

Full detail: `.planning/PROJECT.md` §2.6–2.7 and `.planning/research/LEARNING-PATTERNS.md`.

### 5.3 Additions (2026-11-05)

- **Topic prediction method:** encodes the five signals expert coaches use (PYQ frequency, recurrence gap, static↔current linkage, news triggers, anniversaries) in a backtested logistic model. Outputs likelihood bands + reasons + practice questions for top topics. See `.planning/research/TOPIC-PREDICTION.md`.
- **Pedagogy playbooks:** anonymous playbooks distilled from the public UPSC teaching patterns of two educators: PYQ-first learning, retrieve-then-space, mistakes notebook, memory heatmap, designed focus, layered map mode, elimination trainer, question-demand decoder, theme bank. See `.planning/research/PEDAGOGY.md`.
- **Service Preference Advisor (v1.2):** a reasoned service + cadre preference order for DAF-I.
- **Naming rule:** no teacher, institute, platform, channel or course names in the UI. Books and official sources may be named.

## 6. Key user journeys (v1)

1. **Onboarding (≈15 min + Learning Pattern Test ≈15 min):** sign in → exam target (CSE 2027 pre-filled) → availability per weekday → subject self-assessment + 20-Q diagnostic → Learning Pattern Test → strength profile → first weekly plan generated.
2. **Daily loop:** morning notification → "Today" screen (3–6 tasks, total fits available time) → study with source pointer (book + chapter) → mark done / rate difficulty → evening CA quiz (10 min) → due reviews → nightly rebalance.
3. **Bad day:** "Only 45 min today" → Koach replans to revisions + CA only and shows what moved.
4. **Weekly review:** Sunday report + coach note + next week's plan to accept or adjust.
5. **Optional decision:** Fit Quiz → explore and compare the top fits → Decision Coach → choice recorded → optional nodes added to the plan.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Today screen loads <1.5s on mid-range Android; offline read of today's plan and due cards (local cache, sync on reconnect). |
| Reliability | Nightly jobs are idempotent and retried; a failed AI step never blocks the daily plan (deterministic fallback). |
| Cost | Target <₹150 (~US$2) per active user per month in Vertex spend at v1 usage: Flash for bulk, Pro only for evaluation/reasoning, context caching, batch prediction for the nightly CA pipeline. |
| Privacy | India **DPDP Act 2023** aligned: explicit consent, data export/delete, minimal PII, data stored in `asia-south1` (Mumbai). Uploaded answer images are private to the user. |
| Security | Firebase Auth / Identity Platform tokens verified server-side; Secret Manager for all secrets; least-privilege service accounts; no client-side model keys. |
| AI quality | Eval sets per AI feature (MCQ correctness, tagging accuracy, evaluation agreement with human graders) run in CI before prompt or model changes ship. |
| Accessibility | Dynamic type, dark mode, works on 5" Android screens. |

## 8. Technical architecture (proposed)

```
 Mobile (Expo React Native + TS)
   │  Firebase Auth (ID token)       FCM push (expo-notifications)
   ▼
 Cloud Run: koach-api  (Node 22 + TypeScript, Fastify, zod-validated, OpenAPI)
   ├─ Cloud SQL Postgres 16 (+ pgvector)  — users, plans, tasks, cards, reviews, syllabus graph, PYQs, embeddings
   ├─ Vertex AI  — Gemini (Flash / Pro), Gemini embeddings, grounding, (Imagen v1.1)
   ├─ Cloud Storage — answer images, user uploads, CA raw snapshots
   ├─ Pub/Sub — domain events (task.completed, review.logged, ca.ingested)
   └─ Secret Manager
 Cloud Run Jobs (triggered by Cloud Scheduler):
   ├─ ca-ingest      (daily 05:30 IST)  fetch → summarise → map → generate MCQs
   ├─ plan-rebalance (nightly 23:30 IST) recompute plans, due loads, nudges
   └─ predict-topics (weekly) recompute node priority scores
 CI/CD: Cloud Build (deploy.yaml) → Artifact Registry → Cloud Run;  EAS Build for mobile binaries
 Observability: Cloud Logging + Error Reporting, Sentry on mobile, AI call logging with token/cost metrics
```

**Repo layout (monorepo, pnpm workspaces):** `apps/mobile` (Expo), `apps/api` (Fastify), `apps/jobs` (Cloud Run Jobs), `packages/shared` (types + zod schemas), `packages/algo` (scheduler, FSRS wrapper, priority scoring: pure TS with exhaustive tests), `packages/ai` (Vertex client, prompts, evals), `infra/` (gcloud bootstrap scripts, Terraform later), `deploy.yaml`.

**Why these choices:**
- *Expo:* fastest route to iOS and Android with TypeScript, OTA updates and managed push.
- *Postgres over Firestore:* planning, analytics and graph queries are relational; pgvector avoids a separate vector DB at this scale.
- *Cloud Run:* scales to zero (cheap during dogfooding), handles containers for both the API and jobs.

## 9. Domains and expertise we need help from

| Domain | Why | How (v1) |
|---|---|---|
| **UPSC subject-matter expert** (recent qualifier / mentor) | Validate the syllabus graph, source map, PYQ tagging and strategy KB; calibrate answer evaluation | 5–10 paid review hours; spot-check 10% of AI tags |
| **Learning science** | Learning Pattern Test game design and scoring, FSRS usage, cue generation validity | Literature-based design, documented in the spec; reviewed by an advisor if available |
| **Data / ML** | Topic-prediction backtest, FSRS parameter fitting, mastery model | In-house (Claude + GSD), with backtest reports |
| **AI engineering + evals** | Prompts, grounding, hallucination control, eval suites, cost control | In-house |
| **Mobile (RN/Expo)** | App UX, offline, notifications | In-house |
| **Backend / GCP / DevOps** | Cloud Run, Cloud SQL, IAM, Cloud Build, Scheduler | In-house |
| **Product design** | Calm, low-friction daily UX | Lightweight; design system in Phase 1 |
| **Legal / content licensing** | Copyright for news and books, DPDP compliance | Policy: link + summarise, no republication; checklist before public launch |

## 10. Success metrics

**For Shivanshi (primary):**
- ≥85% of planned weekly hours completed over a 4-week rolling window
- First pass of the Prelims syllabus by 15 Feb 2027; ≥3 revisions of every node before 23 May
- Retention: ≥85% recall on due reviews (FSRS target retention 0.9)
- Mock test trend: consistent scores above the previous 3 years' general cut-off band by April
- Optional decided by 15 Dec 2026

**Product:**
- D7/D30 retention (public phase), CA quiz completion rate, nudge → task completion lift (A/B), AI eval pass rates ≥95% (MCQ validity) and tagging accuracy ≥90%

## 11. Release plan (milestones)

| Milestone | Target | Contents |
|---|---|---|
| **v1.0 Daily Coach MVP** | ~3 Dec 2026 | GCP foundation + deploy pipeline, syllabus graph + PYQ bank + source map, onboarding + Learning Pattern Test, scheduler + FSRS + reminders, CA pipeline + daily quiz, memory cues + nudges, Optional Discovery |
| **v1.1 Prelims Engine** | ~Jan 2027 | Topic prediction with backtest, mock tests + analytics, weekly reports, readiness score, learned reminder timing, CSAT module |
| **v1.2 Mains Engine** | ~Mar 2027 (used from late May) | Answer-writing evaluation (photo → feedback), essay and ethics practice, optional-subject plan, Mains-mode scheduler |
| **v2.0 Public launch** | After Prelims 2027 | Multi-user polish, payments, community/mentor review marketplace, Hindi medium |

## 12. Out of scope (v1)

- Hosting copyrighted book or newspaper content (link + summarise only)
- Live classes / video lectures
- Social feed or community chat
- Payments and subscriptions (until public launch)
- Hindi and other medium support (v2)
- Web app (mobile first; admin tooling may be a simple internal web page)

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| AI-generated MCQ has a wrong answer, which damages trust | Grounded generation + second-pass verifier + source links + "report error" button; error feedback removes the item for everyone |
| Topic prediction is overtrusted | Shown as likelihood bands with reasons; backtest numbers visible; never shown as "will come" |
| 4-week MVP slips and eats into Prelims prep | YOLO GSD execution, strict v1 scope, Shivanshi's own study plan is never blocked on the app (the manual plan in onboarding works on day 1) |
| Content licensing | Link-and-summarise policy, PIB/PRS/government sources first |
| Vertex model churn / preview models | Model IDs in config, GA models only for production paths, eval suite gates any switch |
| Data quality of the syllabus graph and PYQ tags | AI-assisted tagging + SME spot checks + user "this is mis-tagged" feedback |

## 14. Open questions

1. Will a UPSC SME / mentor be available for ~5–10 review hours in November?
2. iOS, Android, or both for Shivanshi's own device? (Affects which EAS build is first.)
3. Preferred newspaper (The Hindu / Indian Express)? Koach links and summarises; it doesn't reproduce articles.
4. Any coaching material or notes Shivanshi already uses that Koach should map onto instead of replacing?
5. GCP billing account and project naming (`koach-prod`, `koach-dev`?) and budget alert threshold.
