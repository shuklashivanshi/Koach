# Research: UPSC teaching patterns Koach will encode

**Researched:** 2026-11-05
**Scope (as asked):** UPSC-specific pedagogy of two named educators only. No generic teaching theory.
**Confidence:** Low–medium. Most of their method lives in videos and paid courses; written public material is thin and largely self-published or promotional. Decision (2026-11-05): build from public material now, and refine with the user's own notes from their classes.

> **Hard UI rule:** teacher names, institutes, platforms, channels and courses are **never shown in the app**. Internally, patterns are stored as anonymous playbooks (`PB-PYQ`, `PB-MAP`, …). Standard books and official sources (NCERT, PIB, Economic Survey, UPSC) may be named.

---

## Educator A: PYQ-centric, active-learning mentor (IRS, AIR 297 in CSE 2022; GS + Environment/S&T/Economy; Mains answer writing)

| Observed pattern | Evidence (public) |
|---|---|
| **PYQ as the spine.** Solves *every* Prelims PYQ 2013–2024 topic-wise *with* the learner, in long "PYQ marathon" sessions | Site's "Complete PYQs Analysis Series", STEP initiative |
| **"Tell you where to look, not what to see."** Guided independence: point to the source and demand, and let the learner build understanding | Channel tagline |
| **Active over passive learning.** Lectures followed immediately by MCQs/quizzes; reading alone is not treated as retention | Channel posts; video topics on active learning from lectures |
| **Four-step retention:** active recall + spaced revision | Channel post |
| **Mistakes notebook.** Wrong questions are stored, revisited via prompts, and a **memory heatmap** shows strong/weak topics before Prelims/Mains | Channel post |
| **Answer writing through PYQs.** Mains PYQs are segregated topic-wise; classes take ~10 PYQs, brainstorm, and decode the **question demand**; "approaches to quickly counter questions" cut thinking time in the exam | "Write Smart" pages |
| **Reusable value-add templates.** Facts, figures and examples kept ready for recurring Mains themes (e.g. good governance) | Student testimonial |
| **Mains theme anticipation.** Identifies themes on which questions recur | Student testimonial |
| **Environment through current affairs.** Links static environment to summits and policies | Educator ranking pages |
| **Focus is designed, not forced.** Broken focus comes from task switching, vague goals and environment | Channel post |
| **Well-being + community.** Openness about failure and burnout, mental-health check-ins, long co-study streams before exams | Profile article |
| **Prelims switch timing.** Explicit guidance on when to move from integrated to Prelims-only prep | Channel post |

## Educator B: map-first, visual geography teacher (Physical, Indian and World Geography; Environment; Places in News)

| Observed pattern | Evidence (public) |
|---|---|
| **Layered map construction:** blank map → physiography → rivers → borders → context (climate, economy, flora/fauna) → overlay PYQs + current affairs | Educator profile (four-step class flow) |
| **"See the map in the exam hall."** Goal is spatial recall: visualise the location when reading the question | Profile; series titles ("… through Maps") |
| **Causal explanation.** *Why* a river flows that way, *why* a reserve sits there; reduce rote learning | Profile; reviews ("makes Physical Geography visual") |
| **Learner draws along.** Blank outline-map workbook filled during class | Profile |
| **Places in News as a 1–2 year one-shot,** plotted on maps; similar one-shots for species and agriculture/minerals | Series catalogue |
| **Mnemonics for long lists** (Ramsar sites, tiger reserves by state) | Profile |
| **MCQ practice on maps** (map-based handpicked question tests) | Series catalogue |
| **Conversational, beginner-friendly tone; foundation first** (NCERT before advanced) | Reviews |
| Critique to avoid: very long lectures, slow for revision mode, static environment content | Reviews |

## Patterns common to both (strongest signal)
1. PYQs drive *what* to study and *how deep*.
2. Learn → immediate retrieval practice → spaced revision.
3. Explain the *why* (causal / first principles), not just facts.
4. Tie static content to current affairs at the point of learning.
5. Mistakes are an asset: log, tag, revisit.

---

## How Koach encodes this (anonymous playbooks)

| Playbook | Koach behaviour | Feature / phase |
|---|---|---|
| **PB-PYQ: PYQ-first priming** | Before a Learn task, show 2–3 PYQs on the node ("this is how it's asked"), then the source + chapter, then a 3–5 question retrieval check right after | Planner / Study session · v1.0 |
| **PB-WHERE: Where to look** | The coach gives source, chapter and question demand. It doesn't hand over a summary first; the explanation comes after an attempt | Study session, Cues · v1.0 |
| **PB-MISTAKE: Mistakes notebook** | Every wrong MCQ is saved with a cause tag (*concept gap / misread / elimination error / guess*) and fed to FSRS; monthly "your recurring traps" | v1.0 (CA quiz, diagnostic), v1.1 mocks |
| **PB-HEAT: Memory heatmap** | Syllabus heatmap of mastery × likelihood; drives revision before Prelims | v1.0 (You tab), v1.1 |
| **PB-FOCUS: Designed focus** | One task per session, a specific goal line ("Finish Ch 22 + 5 PYQs"), and a weekly burnout check-in | Planner, Nudges · v1.0 |
| **PB-MAP: Layered map mode** | For geography/environment/places-in-news nodes: interactive blank map, layers revealed step by step, tap-to-locate recall drills, monthly places-in-news map | v1.1 |
| **PB-ELIM: Elimination trainer** | After each PYQ, mark which statements you eliminated and why; analyse every wrong option | v1.1 |
| **PB-THEME: Mains theme bank** | Reusable value-add cards (data, examples, reports, judgments, committee recommendations) per recurring theme | v1.2 |
| **PB-DEMAND: Question-demand decoder** | Before writing: core theme + directive + dimensions checklist (political, economic, social, environmental, …), then structure | v1.2 |
| **PB-SWITCH: Phase switch** | The scheduler moves to Prelims-only mode at a computed date (~Feb), and to Mains mode after Prelims | v1.0 scheduler |
| **PB-CA-LINK: Static ↔ CA link** | Every CA item opens its static node; every node shows its recent CA | v1.0 |

**Refinement loop:** the user can add "class notes / observations" in an internal `pedagogy_notes` store (not shown in the UI). An SME pass turns them into playbook updates.

## Sources
- [Dr. Shivin Chaudhary: official site](https://www.drshivin.com/), [PYQs](https://www.drshivin.com/pyqs), [Write Smart](https://www.drshivin.com/write-smart)
- [Clarity for UPSC: Telegram channel](https://t.me/s/theanonymousupscaspirant), [Sarrthi Mentorship: Telegram channel](https://t.me/s/SarrthiMentorship?q=%23UPSC)
- [SigmaStory profile](https://sigmastory.in/inspiring-story-of-dr-shivin-chaudhary-from-anonymous-upsc-aspirant-to-air-297-and-now-educator/), [theIAShub topper page](https://theiashub.com/toppers/upsc/2022/dr-shivin-chaudhary-air-297-cse-upsc-2022)
- [Educator's Journey: Sudarshan Gurjar profile](https://theeducatorsjourney.com/sudarshan-gurjar-biography-unacademy-geography/)
- [LotusArise review](https://lotusarise.com/qna/upsc/unacademy-review-sudarshan-gurjar-sir-is-it-worth-your-time-for-upsc-geography)
- [Unacademy: Indian Geography through Maps series](https://unacademy.com/a/indian-geo-maps), [World Maps series](https://unacademy.com/a/shunya-se-shikhar-tak)
- [Online-IAS: Best teachers list](https://www.online-ias.com/resources/best-teachers-for-upsc/)
