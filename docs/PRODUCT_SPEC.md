# Koach — Product Spec Sheet (v0.2)

> A UPSC Civil Services coach that knows the exam ecosystem the way a topper-mentor does, and knows *you* the way a good teacher does.

| | |
|---|---|
| **Owner** | Shivanshi Shukla |
| **Status** | Draft for review (planning complete, nothing built yet) |
| **Date** | 2026-11-05 |
| **Primary user (v1)** | Shivanshi: CSE 2027, working (3–5 study hrs/day), partly prepared, optional not yet chosen |
| **Later users** | UPSC aspirants in general (multi-user from day one, public launch after Prelims 2027) |
| **Platform** | React Native (Expo) + TypeScript app; TypeScript backend on GCP; AI on Vertex AI; speech on Google Cloud |

> **How to read this:** this sheet is the product narrative: problem, users, journeys, architecture, metrics, risks. The **canonical, detailed feature definitions** live in [`.planning/PROJECT.md`](../.planning/PROJECT.md), testable requirements in [`REQUIREMENTS.md`](../.planning/REQUIREMENTS.md), phases in [`ROADMAP.md`](../.planning/ROADMAP.md), and design in [`UI_SPEC.md`](UI_SPEC.md). If anything here disagrees with PROJECT.md, PROJECT.md wins.

---

## 1. Problem

UPSC preparation has too much advice and too little guidance that fits the person following it:

1. **Too many approaches.** Every coaching source prescribes different books, sequences and timelines. Aspirants burn weeks deciding instead of studying.
2. **Static and current affairs drift apart.** Aspirants read the news but never connect it to the syllabus, so it doesn't stick and isn't revised.
3. **Forgetting is the real enemy.** The syllabus is huge. Without planned revision, most material is lost before Prelims. Toppers consistently cite multiple revisions of limited sources as decisive.
4. **Study methods ignore how the person learns.** Some people remember pictures and places, some remember what they hear, some what they write, some what they do with their hands. Generic plans and notes ignore this.
5. **The optional is a blind choice.** It is worth 500 of 1750 Mains marks, with ~48 options and contradictory "scoring optional" advice.
6. **Working aspirants have little time.** With 3–5 hours a day, every hour must go to the highest-yield item.

## 2. Vision and core value

**Core value:** *Every day, Koach tells me exactly what to study, revise and practise next, and how to make it stick for me, with the reasoning backed by UPSC data.*

If everything else fails, the **daily plan + spaced-revision engine** must work.

### Design principles
1. **Data over opinion.** Every recommendation (book, topic priority, time split, optional fit) is backed by PYQ data, the official syllabus, official UPSC reports or a cited strategy source. Strategy sources are cited internally and never named in the app.
2. **Personal, but honest.** A short game-based test finds each learner's strengths across visual, auditory, reading/writing and kinesthetic patterns. Koach leads with those strengths, keeps a mix, and keeps measuring what actually sticks. It never labels anyone as a single "type".
3. **One source per topic.** Koach picks one standard source per syllabus node and defends it. Fewer sources, more revisions.
4. **Opinionated defaults, transparent reasoning.** The coach decides, and explains why when asked.
5. **Honest about uncertainty.** Topic prediction is shown as likelihood with reasons, never as a guarantee.
6. **Calm and minimal.** Less text, one action per screen, Light Academia look (see `UI_SPEC.md`).

## 3. Exam context (ground truth the product encodes)

| Item | Value | Source |
|---|---|---|
| CSE 2027 notification | 13 Jan 2027 (applications close ~2 Feb) | UPSC Calendar 2027 (released 20 May 2026) |
| **Prelims** | **23 May 2027** (GS Paper I + CSAT Paper II, same day) | UPSC Calendar 2027 |
| Mains | From 20 Aug 2027 (5 days) | UPSC Calendar 2027 |
| Days to Prelims at project start | ~199 (from 5 Nov 2026) | — |
| Prelims GS-I | 100 questions, 200 marks, −1/3 negative marking; decides the cut-off | UPSC rules |
| CSAT | Qualifying, 33% | UPSC rules |
| Mains | 9 papers (2 qualifying languages + Essay + GS I–IV + Optional I–II), 1750 marks + 275 interview | UPSC rules |
| DAF-I | Filled after the Prelims result; includes service and cadre preferences | UPSC rules |

> The official calendar and notification on upsc.gov.in are the source of truth. Koach re-checks them when the notification releases.

**Strategy for Shivanshi (CSE 2027, working, partly prepared):**
- **Nov 2026–Jan 2027:** integrated GS reading (Prelims + Mains-oriented), daily current affairs, **choose the optional by 15 Dec 2026**.
- **Feb–mid-May 2027:** Prelims-intensive mode (revision cycles, PYQs, mocks, CA revision, CSAT check).
- **24 May–Aug 2027:** Mains mode (answer writing, optional, essay, ethics). Service preferences for DAF-I.

## 4. Users and personas

- **P1: Shivanshi (dogfood user).** Working professional, 3–5 hrs/day, some static subjects done, no structured revision or answer writing yet, optional undecided. She says repetition and first-principles explanations help her remember. Koach gives every learner both (spaced repetition and the "why" cue) and adds methods matched to her measured learning pattern.
- **P2 (later): First-attempt full-timer.** 8–10 hrs/day; needs structure and source discipline.
- **P3 (later): Repeater.** Has given Prelims before; needs gap analysis from past scores and mock data.

## 5. Feature summary

Full detail for every row is in `.planning/PROJECT.md` (section shown). Requirement IDs are in `REQUIREMENTS.md`.

| Group | Feature | What it does, in one line | Release | PROJECT.md | IDs |
|---|---|---|---|---|---|
| Foundation | Knowledge base | Syllabus graph (incl. optional syllabi), tagged PYQ bank, "what to read from where", PYQ stats, cited strategy KB, pedagogy playbooks, naming guard | v1.0 | Foundations | KB-01..08 |
| Foundation | Profile & diagnostic | Target, hours, quiet hours, self-rating + 20-question diagnostic | v1.0 | Foundations | PROF-01..02 |
| Algorithmic | **Scheduling** | Weekly plan + time-boxed daily to-do, PYQ-first Learn sessions, phase switch, nightly rebalance, quick replan | v1.0 | 1.1 | SCHED-01..05, PED-01, PED-04 |
| Algorithmic | **Reminders** | App push with quiet hours and per-type settings; learned send times in v1.1 | v1.0 / v1.1 | 1.2 | NOTIF-01..03 |
| Algorithmic | **Algorithms** | FSRS spaced repetition, mastery model, mistakes notebook, memory heatmap, ≥3-revision guarantee | v1.0 / v1.1 | 1.3 | SRS-01..04, PED-02, PED-03 |
| Algorithmic | **Topic prediction** | Expert five-signal model, backtested; likelihood bands + reasons + practice questions | v1.1 | 1.4 | PRED-01..04 |
| AI | **Current Affairs Questionnaire** | Daily ingest → summary → syllabus link → verified UPSC-style MCQs | v1.0 | 2.1 | CA-01..06 |
| AI | **Personalised Nudges** | Rule-timed, Gemini-written push nudges, Sunday coach note, well-being check-in | v1.0 | 2.2 | NUDGE-01..03 |
| AI | **Optional Discovery** | Fit quiz ranking ~48 optionals, explorer & compare with official data, decision coach | v1.0 | 2.3 | OPT-01..05 |
| AI | **Evaluation + Reports** | Daily summary + heatmap (v1.0); mocks, analytics, elimination trainer, readiness (v1.1); Mains answer evaluation (v1.2) | v1.0–v1.2 | 2.4 | EVAL-01..03, PED-05, MAINS-01..02, PED-07..08 |
| AI | **Learning Pattern Test** | Four games score Visual / Auditory / Reading-Writing / Kinesthetic → strength profile | v1.0 | 2.5 | LPT-01..03 |
| AI | **Memory Cues Generation** | Memory palace, spoken cue sheets and chants, mnemonics, cue sheets, blurting, hands-on drills, repetition, first-principles | v1.0 (+ map mode v1.1, images v1.2) | 2.6 | CUE-01..09, PED-06 |
| AI | **Service Preference Advisor** | Reasoned service + cadre order for DAF-I | v1.2 | 2.7 | SVC-01..03 |

## 6. Key user journeys (v1.0)

1. **Onboarding (~30 min in total):**
   1. Sign in.
   2. Set the exam target (CSE 2027 pre-filled) and hours per weekday.
   3. Rate subjects and take a 20-question diagnostic.
   4. Take the **Learning Pattern Test** (~15 min) and see the strength profile.
   5. The first weekly plan is generated.
2. **Daily loop:**
   1. Morning push.
   2. **Today** shows 3–6 tasks that fit the day's time.
   3. A Learn session runs: 2–3 PYQs → source + chapter → study → retrieval check.
   4. Mark done and rate it.
   5. "Make it stick" gives cues in the learner's strongest pattern.
   6. Evening CA quiz (~10 min), then due reviews.
   7. Nightly rebalance.
3. **Bad day:** "Only 45 min today" → Koach trims to revision + CA and shows what moved.
4. **Weekly review:** Sunday coach note + well-being check-in → next week's plan.
5. **Choosing the optional:** Fit Quiz → explore and compare the top fits → Decision Coach → choice saved → the optional's topics join the plan.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Today screen loads in <1.5s on a mid-range Android phone; today's plan and due cards work offline (local cache, sync on reconnect). |
| Reliability | Nightly jobs are idempotent and retried; a failed AI step never blocks the daily plan (deterministic fallback). |
| Cost | < ~US$2 (≈₹150) per active user per month for AI + speech: Flash-class models for bulk work, Pro-class only for evaluation and reasoning, context caching, batch prediction for the nightly CA pipeline, cached TTS audio. |
| Privacy | India **DPDP Act 2023** aligned: explicit consent, data export/delete, minimal PII, data stored in `asia-south1` (Mumbai). Voice recordings and answer photos are private to the user. |
| Security | Firebase Auth / Identity Platform tokens verified server-side; Secret Manager for all secrets; least-privilege service accounts; no model keys on the device. |
| AI quality | Eval sets per AI feature (MCQ correctness, tagging accuracy, mnemonic decode check, answer-evaluation agreement with human graders) run in CI before any prompt or model change ships. |
| Naming | A blocked-names filter runs on all client-facing text, including generated text. |
| Accessibility | WCAG AA contrast, Dynamic Type, Reduce Motion, screen readers, 5" Android screens. |

## 8. Technical architecture

```
 Mobile (Expo React Native + TS)
   │  Firebase Auth (ID token)      FCM push (expo-notifications)
   ▼
 Cloud Run: koach-api  (Node 24 + TypeScript, Fastify, zod-validated, OpenAPI)
   ├─ Cloud SQL Postgres 16 (+ pgvector) — users, plans, tasks, cards, reviews, syllabus graph, PYQs, embeddings
   ├─ Vertex AI — Gemini (Flash / Pro), Gemini embeddings, grounding; Imagen (v1.2)
   ├─ Cloud Text-to-Speech / Speech-to-Text (Chirp) — audio cues, Listen & Recall game
   ├─ Cloud Storage — answer photos, voice clips, generated audio, user uploads, CA snapshots
   ├─ Resend — transactional email for sign-in codes
   ├─ Pub/Sub — domain events (task.completed, review.logged, ca.ingested)
   └─ Secret Manager
 Cloud Run Jobs (triggered by Cloud Scheduler):
   ├─ koach-ca-ingest   (daily 05:30 IST)   fetch → summarise → map → generate + verify MCQs
   ├─ koach-rebalance   (nightly 23:30 IST) recompute plans, due loads, nudges
   └─ koach-predict     (weekly, v1.1)      recompute topic-likelihood scores
 CI/CD: Cloud Build (deploy.yaml) → Artifact Registry → Cloud Run;  EAS Build for mobile binaries
 Observability: Cloud Logging + Error Reporting; Sentry on mobile; AI/speech call logging with token and cost metrics
```

**Repo layout (pnpm monorepo):**

| Path | Contents |
|---|---|
| `apps/mobile` | Expo app |
| `apps/api` | Fastify API |
| `apps/jobs` | Cloud Run Jobs |
| `packages/shared` | Types + zod schemas |
| `packages/algo` | Scheduler, FSRS wrapper, priority scoring, pattern scoring; pure TS with exhaustive tests |
| `packages/ai` | Vertex + speech clients, prompts, evals |
| `packages/ui` | Design tokens, components, engravings, from `UI_SPEC.md` |
| `infra/` | gcloud bootstrap scripts |
| `deploy.yaml` | Cloud Build pipeline |

**Why these choices:**
- **Expo:** the fastest TypeScript route to iOS + Android, with OTA updates and managed push.
- **Postgres + pgvector:** planning, analytics and graph queries are relational, and pgvector avoids a separate vector DB.
- **Cloud Run:** scales to zero and runs both the API and the jobs.

## 9. Domains and expertise needed

| Domain | Why | How (v1) |
|---|---|---|
| **UPSC subject-matter expert** (recent qualifier / mentor) | Validate syllabus graph, source map, PYQ tags, strategy KB, optional fit weights; calibrate answer evaluation | 5–10 paid review hours; spot-check 10% of AI tags |
| **Learning science** | Learning Pattern Test game design and scoring, FSRS usage, cue validity | Literature-based design (see research notes); advisor review if available |
| **Data / ML** | Topic-prediction backtest, FSRS parameter fitting, mastery and pattern-score updates | In-house (Claude + GSD), with backtest reports |
| **AI engineering + evals** | Prompts, grounding, hallucination control, eval suites, cost | In-house |
| **Mobile (RN/Expo)** | App UX, offline, audio, maps, notifications | In-house |
| **Backend / GCP / DevOps** | Cloud Run, Cloud SQL, IAM, Cloud Build, Scheduler | In-house |
| **Product design** | Light Academia design system, calm daily UX | `UI_SPEC.md`; per-phase UI specs |
| **Legal / content licensing** | Copyright for news and books, DPDP compliance, naming rule | Link + summarise policy; checklist before public launch |

## 10. Success metrics

**For Shivanshi (primary):**
- ≥85% of planned weekly hours completed over a 4-week rolling window
- First pass of the Prelims syllabus by 15 Feb 2027; ≥3 revisions of every studied node before 23 May 2027
- ≥85% recall on due reviews (FSRS target retention 0.9)
- Mock scores consistently above the previous 3 years' general cut-off band by April 2027
- Optional chosen by 15 Dec 2026

**Product:**
- AI quality: ≥95% verified-MCQ validity and ≥90% tag accuracy on eval sets
- Engagement: CA quiz completion rate and nudge → task-completion lift (A/B)
- Prediction: topic-prediction lift over the frequency baseline (backtest)
- Learning patterns: whether pattern-matched cues show higher recall than others (measured, not assumed)
- Public phase: D7/D30 retention

## 11. Release plan

| Milestone | Target | Contents |
|---|---|---|
| **v1.0 Daily Coach MVP** | ~3 Dec 2026 | Phases 1–7: GCP foundation + deploy; knowledge base; onboarding + Learning Pattern Test; planner + FSRS + reminders + mistakes notebook + heatmap; CA pipeline + daily quiz; memory cues + nudges; Optional Discovery |
| **v1.1 Prelims Engine** | ~Jan 2027 | Phases 8–10: topic prediction + practice questions; mocks, analytics, elimination trainer, weekly report, readiness score; learned reminder timing, per-user FSRS, CSAT, map mode |
| **v1.2 Mains Engine** | ~Mar 2027 (used from late May) | Phases 11–13: answer evaluation (photo or typed) + demand decoder + theme bank; Mains-mode scheduler, essay/ethics, palace images; Service Preference Advisor |
| **v2.0 Public Launch** | After Prelims 2027 | Public onboarding, payments, Hindi medium, mentor review marketplace |

## 12. Out of scope

The authoritative list is in `.planning/PROJECT.md` → Out of Scope. In short:
- no naming of teachers, institutes or platforms
- no reuse of educators' content
- no hosted copyrighted text
- no single-"type" labelling
- no taster test
- no generated music
- no WhatsApp or email
- no "guaranteed" predictions
- no live classes or social feed
- no payments or Hindi before v2.0
- no web app
- no non-Google AI providers

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| An AI-generated MCQ has a wrong answer and damages trust | Grounded generation + second-pass verifier + official source links + "report error"; reported items are pulled for everyone |
| Topic prediction is overtrusted | Likelihood bands with reasons; backtest numbers visible; ships only if it beats the baseline |
| Learning-pattern results are over-interpreted | Strength profile, never a label; mixed cues; scores keep updating from real recall |
| A naming-rule breach in generated text | Blocked-names filter on all client-facing text; neutral labels for institute-titled books |
| The 4-week MVP slips and eats into Shivanshi's prep | YOLO GSD execution, strict v1.0 scope; a starter plan from self-assessment works on day 1 |
| Optional decision deadline (15 Dec) is missed | Phase 7 can run in parallel with Phases 3–6 |
| Content licensing | Link-and-summarise policy, official sources first |
| Vertex model churn / preview models | Model IDs in config, GA models for production, eval suite gates any switch |
| Syllabus-graph or PYQ-tag quality | AI-assisted tagging + expert spot checks + in-app "mis-tagged" feedback |

## 14. Open questions

1. Will a UPSC subject-matter expert be available for ~5–10 review hours in November?
2. Which device does Shivanshi use, iOS or Android? (Decides the first EAS build.)
3. Preferred newspaper for linked summaries (The Hindu / Indian Express)?
4. Notes or materials Shivanshi already uses that Koach should map onto?
5. Class notes from the two educators' sessions, to refine the pedagogy playbooks?
6. GCP billing account, project names (`koach-dev`, `koach-prod`) and budget alert threshold?

## 15. Glossary

| Term | Meaning |
|---|---|
| **Node** | One atomic syllabus topic in the syllabus graph (e.g. Polity → Parliament → Money Bills) |
| **PYQ** | Previous year's UPSC question |
| **CA** | Current affairs |
| **FSRS** | Free Spaced Repetition Scheduler, the revision-timing algorithm |
| **Strength profile** | The learner's four 0–100 learning-pattern scores |
| **Cue** | A memory aid in a given format (palace, audio chant, cue sheet, drill, etc.) |
| **Playbook (PB-\*)** | An anonymous teaching pattern the app follows |
| **DAF-I** | Detailed Application Form I, filled after Prelims; holds service and cadre preferences |
| **Likelihood band** | High / Medium / Low chance that a topic is asked, with reasons |
