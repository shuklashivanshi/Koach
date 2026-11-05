# Research: How UPSC experts predict topics, and how Koach will do it

**Researched:** 2026-11-05
**Confidence:** Medium. The methods are consistent across sources, but no source publishes a backtested hit rate.
**UI rule:** Nothing in this file (institutes, teachers, sites) is ever named in the app UI.

---

## 1. What expert coaches actually do

Across coaching analyses and mentor guides, the "prediction" process boils down to the same five-signal, judgment-based method:

| # | Signal | How experts use it | Typical window |
|---|---|---|---|
| 1 | **PYQ frequency** | Tag every PYQ to a syllabus topic. Topics asked 4+ times in 10 years are treated as near-certain *themes* (exact questions rarely repeat; the concept returns in a new format) | Last 10–15 years |
| 2 | **Gap / recurrence** | A topic asked once 2–3 years ago is "due"; themes come back in cycles | Since last asked |
| 3 | **Static ↔ current linkage** | Classify each question as static, current, or static + current. The trend is toward more statement-based questions and more current-affairs fusion, with Environment and S&T rising and Polity's share varying year to year | 5-year trend |
| 4 | **News triggers** | New Central Acts (asked within ~2 yrs), landmark SC judgments (1–2 yrs), government reports and indices (Economic Survey, Forest Survey, HDR), international summits, and words like *recently*, *first time*, *newly notified/inscribed* | 12–18 months before the exam |
| 5 | **Anniversaries** | 25/50/75/100-year milestones of constitutional, historical and scientific events. A provision + a current event + an anniversary together is treated as a very strong signal | Exam year |

Complementary practices from PYQ-analysis guides:
- **Source mapping:** for every PYQ, ask which source it came from (NCERT, standard book, current affairs, report), then prioritise the sources that keep contributing.
- **Wrong-option analysis:** Prelims distractors are often next year's correct statements, so analyse every option, not just the answer.
- **Mains directive analysis:** the same syllabus line is asked with different directives (*discuss* / *examine* / *critically analyse*), so themes recur while the demand changes.
- **80/20:** prioritise topics appearing in at least 3 of the last 5 papers.

**Key gap:** none of the published "prediction" lists report a backtest or hit rate. One claims "70–80% of questions come from predictable areas", which describes how predictable the *paper* is, not how accurate the *predictions* are. **Koach's edge: measure it.**

## 2. Koach's model

### 2.1 Unit of prediction
A **syllabus node** (atomic topic in the Phase 2 graph) for a target exam year *Y*, separately for Prelims GS-I and each Mains GS paper.

### 2.2 Features per (node, Y)

| Feature | Definition |
|---|---|
| `freq_w` | Exponentially weighted count of PYQs tagged to the node over Y−15…Y−1 (half-life ≈ 5 yrs) |
| `asked_last_k` | Years asked in the last 5 / 10 |
| `gap` | Years since last asked; `gap_ratio` = gap ÷ the node's median inter-arrival time (hazard-style "due" signal) |
| `subject_trend` | Subject share slope over the last 5 years (e.g. Environment ↑) |
| `ca_salience` | Volume of mapped current-affairs items in the 18 months before the exam, weighted by recency and source tier (official > news) |
| `trigger_hits` | Mapped items with trigger types: new Act, SC judgment, report/index release, international summit/convention, *first/largest/recently/newly* language |
| `anniversary` | Node has a 25/50/75/100-year milestone in Y or Y−1 |
| `official_doc` | Node appears in the Budget / Economic Survey / new scheme launch of the preceding year |
| `static_anchor` | Perennial core concept flag (set by an SME during Phase 2) |
| `source_type` | Static / partial / CA-driven mix of the node's past questions |
| `mains_directive_mix` | (Mains) Distribution of directives used on the node; lines never asked in 5+ years |

### 2.3 Models (in order of complexity)
1. **Baselines:** pure frequency; frequency + recency.
2. **v1.1 model:** a transparent weighted score with weights fitted by **logistic regression** on node-year rows (label = node asked in year Y).
3. **Upgrade only if it beats the logistic model on the backtest:** gradient-boosted trees, with SHAP values to keep the reasons explainable.

### 2.4 Backtest protocol
- Train on exam years 2011–2021, test on 2022–2026 (rolling-origin: retrain each year using only data available before that exam).
- Current-affairs features for a past year Y use only news dated before that year's exam (no leakage). Historical CA is rebuilt from official archives (PIB, PRS, Economic Survey) for Y−1.
- **Metrics:**
  - **Top-k coverage:** share of the actual paper's questions whose node is in our top-k nodes (k = 50 / 100 / 200)
  - **Precision@k**
  - **Brier score** for calibration
  - **Lift** over the frequency baseline
- **Ship criterion:** beats the frequency baseline on top-100 coverage in ≥ 4 of 5 test years. The backtest report is stored and its headline number is shown in-app ("In past years, the top 100 topics covered ~X% of questions").

### 2.5 Outputs (decided 2026-11-05: likely topics + practice questions)
- **Likelihood bands** per node: High / Medium / Low, with up to 3 plain reasons ("asked in 6 of the last 10 years", "new law passed this year", "50th anniversary"). Reasons never name institutes or teachers.
- **Scheduler integration:** `priority = f(likelihood, syllabus weight, mastery gap)`.
- **Practice questions for top topics:** UPSC-format MCQs (statement-based, "how many of the above", match-the-pair) and Mains prompts with varied directives, generated for High-band nodes and checked by the same verifier as the CA quiz.
- **Never:** "This will come", or a single predicted paper presented as a forecast.

## Sources
- [Unacademy: PYQ source mapping](https://unacademy.com/content/upsc/upsc-prelims-gs-subject-wise-pyq-source-mapping/)
- [Prayas India: How to analyse UPSC PYQs](https://theprayasindia.com/how-to-analyse-upsc-previous-year-question-papers/)
- [Legacy IAS: Prelims 2026 question prediction](https://www.legacyias.com/upsc-prelims-2026-question-prediction/)
- [Legacy IAS: Trend analysis 2015–2026](https://www.legacyias.com/?p=185292)
- [Anantam IAS: PYQ analysis](https://anantamias.com/upsc-prelims-pyq/)
- [UnderstandUPSC: 5-year trends](https://www.understandupsc.com/upsc-prelims-paper-analysis-5-year-trends-that-predict-the-2026-exam/)
- [Sleepy Classes: Question pattern analysis](https://sleepyclasses.com/upsc-question-patterns-analysis/)
- [UPSCPrep: Decoding directives](https://www.upscprep.com/decoding-directives-for-upsc-mains-answer-writing/)
- [IASGyan: Approaching a Mains question](https://www.iasgyan.in/blogs/how-to-approach-a-question-during-upsc-cse-mains-examination)
