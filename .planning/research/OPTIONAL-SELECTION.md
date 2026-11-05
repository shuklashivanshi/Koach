# Research: Helping aspirants choose their optional

**Researched:** 2026-11-05
**Decisions (user, 2026-11-05):** include **Fit quiz + ranking**, **Explorer & compare** and **Decision coach**; **no taster test**.
**UI rule:** no institute, teacher or platform names; books and official UPSC data may be named.

---

## 1. Why it's hard today
- The optional is 500 of 1750 Mains marks, and the choice is made early, with ~48 options (26 subjects + 22 literatures).
- Advice is noisy: coaching blogs push "scoring" or popular optionals, and success-rate tables circulate without year or source and contradict each other.
- Aspirants often follow toppers or peers instead of checking their own fit, which is the most-cited mistake.

## 2. What the guidance converges on

| Factor | Consensus weight | Notes |
|---|---|---|
| **Interest / genuine comfort** | Highest | Sustains 300–400 hours of study; test: would you read it beyond the exam? |
| **Academic background** | High | Prior knowledge speeds coverage, but it is **not** required, and many succeed outside their background |
| **GS & Essay overlap** | Medium–high | PSIR, Sociology, Public Admin, Geography, History and Anthropology overlap and reduce total load |
| **Material & guidance availability** | Medium | Standard books, PYQs and test series exist? |
| **Scoring stability** | Low–medium (a check, not a driver) | Look at the 5-year range, not the peak; UPSC moderates across years |
| **Syllabus length** | Low | Philosophy and Anthropology are compact; History, Law and Literature are vast |
| **Writing style fit** | Medium | Analytical vs. factual vs. diagram/numerical answers |

**Success-rate data:** UPSC Annual Reports publish optional-wise *appeared* and *recommended* counts. Example (secondary report of Annual Report 2023-24): Geography 1,260 → 94 (7.5%), PSIR 2,378 → 187 (~8%), Sociology 1,836 → 143 (7.8%), Public Admin 521 → 46 (8.8%). Small-sample optionals produce extreme percentages, so Koach uses **multi-year pooled rates with Wilson confidence intervals** and labels low-sample subjects. Figures are ingested from the official reports, not from blogs.

## 3. Koach's feature design

### 3.1 Fit Quiz → ranking across all ~48 optionals (~10 min)
- **Questions:** degree/background, subjects enjoyed in school/college, reading taste (theory, data, narratives, debates), preferred answer style (analytical / factual / diagrams / numericals), hours available before Mains, language (literature optionals), risk appetite.
- **Fit score** (transparent, weights shown on `Why?`):
  `0.30 interest + 0.20 background + 0.15 GS/Essay overlap + 0.10 writing-style fit + 0.10 materials + 0.10 time feasibility + 0.05 scoring stability`
  Weights are config, adjustable after SME review.
- **Output:** a top 5 with one-line reasons, plus "surprising fits" (high fit outside the background).

### 3.2 Explorer & Compare
One page per optional:
- **Computed from Koach's own data:** syllabus size (nodes, estimated hours, from the graph), **GS/Essay overlap %** (node embedding similarity), PYQ style mix (theory / application / numerical / diagram)
- **From UPSC Annual Reports:** multi-year success rate with a confidence band
- **Curated:** standard books (titles only), typical prep time
- **Personal:** "your fit"

**Compare:** 2–3 optionals side by side in a single table.

### 3.3 Decision Coach (conversational, Gemini)
- Answers doubts ("I'm an engineer, can I take Sociology?") from the evidence above.
- **Stress tests:** "Read this syllabus; could you spend 350 hours on it?", "Write a 3-line answer to this PYQ", "What would make you regret this?"
- Busts myths ("scoring optional", "everyone takes X") with data.
- Sets a **decision deadline** (Shivanshi: 15 Dec 2026) and nudges toward it.
- Records the final choice + reasons in the profile. The optional's syllabus nodes are added to the plan with a coverage outline.

## Sources
- [PW: UPSC Annual Report optional table](https://www.pw.live/upsc/exams/upsc-annual-report)
- [BYJU'S: Optional success rates](https://byjus.com/free-ias-prep/success-rate-for-optional-subjects-in-upsc-exam/)
- [LAEX: Evidence-backed optional guide](https://laex.in/how-to-choose-the-right-optional-for-upsc-an-evidence/)
- [SuperKalam: Choosing the optional](https://blog.superkalam.com/blog/choosing-optional-subject-for-upsc-heres-how-to-make-the-smartest-choice)
- [Sleepy Classes: Topper's optional selection](https://sleepyclasses.com/how-to-choose-optional-for-upsc-rank-10-sleepy-classes-topper-strategy-optional-selection-guide/)
- [Vajiram: How to choose optional](https://vajiramandravi.com/upsc-exam/how-to-choose-optional-for-upsc/)
- [CareerIndia: Choosing optional 2025](https://www.careerindia.com/news/how-to-choose-upsc-optional-subject-2025-expert-guide-for-ias-mains-050915.html)
- Official: UPSC Annual Reports (upsc.gov.in), to be ingested in Phase 7
