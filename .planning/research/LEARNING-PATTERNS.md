# Research: Learning Pattern Test and how Koach uses it

**Researched:** 2026-11-05
**Decisions (user, 2026-11-05):**
- Score four sense-based patterns: **Visual, Auditory, Reading/Writing, Kinesthetic**
- Show a **strength profile** (a score for every pattern), lead with the strongest, keep mixing, and keep re-measuring
- Score senses only; memory methods follow from the patterns by a fixed mapping
- Audio = **spoken cues + chants** (text-to-speech); no generated music for now

---

## 1. What the evidence says (and how we stay honest)

| Finding | Implication for Koach |
|---|---|
| People **do** differ measurably in modality-specific memory, e.g. visuospatial span (Corsi / visual-pattern tasks) vs. verbal-auditory span (digit span, word-list recall such as the Rey AVLT) | A short battery of games can produce real, scored differences per pattern |
| The **"meshing" hypothesis** (teach only in your preferred style and you learn more) has not been supported in controlled studies (Pashler et al., 2008; later reviews) | Never lock a learner into one style. Lead with strengths, keep a mix, and judge by actual recall |
| **Method of loci (memory palace)** shows medium-to-large recall benefits in meta-analyses (g ≈ 0.65; d ≈ 0.88 for serial recall), but evidence quality is low–moderate | Memory palace is a strong default for visual-strong learners and a useful tool for everyone with ordered lists |
| **Combining words + images** (dual coding) and **retrieval practice + spacing** help almost everyone | FSRS repetition and a short "why" explanation stay universal; the pattern only changes the *format* of cues |

**Framing in the UI:** "Your learning strengths", never "You are a visual learner". The profile is a living score.

## 2. The Learning Pattern Test (~15 min, onboarding)

Four short games with UPSC-flavoured content, matched in difficulty, played in random order, each ~3 minutes. A **delayed recall** round at the end (~10 min after the first game) captures longer retention, which matters more for UPSC than instant span.

| Pattern | Game | How it works | Scoring |
|---|---|---|---|
| **Visual** | *Map Pins* + *Pattern Grid* | (a) 6–8 places appear on an India/world map for 20s; place them back. (b) A grid with shaded cells grows each round; recreate it | Pin distance error; longest correct grid (span) |
| **Auditory** | *Listen & Recall* | A short TTS recording (a list of 5–9 items, e.g. Schedule subjects, then a 2-sentence fact) plays **once**; type it or say it back (speech-to-text) | Word/idea-unit accuracy; span reached |
| **Reading/Writing** | *Read & Write Back* | Read a ~120-word passage for 60s, then write the key points from memory | Idea units recalled (Gemini scores against a key) |
| **Kinesthetic** | *Arrange & Trace* | Physically sort shuffled event cards into chronological order while learning them, trace a river's course with a finger, then repeat from memory | Order accuracy; trace accuracy |
| *(all)* | **Delayed round** | One item from each game is asked again at the end | Retention ratio per pattern |

**Score per pattern (0–100):** `0.6 × immediate + 0.4 × delayed`, normalised so each game's difficulty is comparable. Initially defaults come from pilot data; later they come from population norms once there are users. Low-confidence results (e.g. the user was interrupted) are flagged and can be retaken.

**Output: Strength profile**, e.g. `Visual 82 · Auditory 64 · Reading/Writing 71 · Kinesthetic 58`, plus one line: *"Pictures and places stick best for you. We'll lead with them."*

**Keep testing:** every cue served is tagged with its format. Later recall on those cards (FSRS grades, quiz accuracy) updates the pattern scores (Bayesian update). An optional re-test is offered every ~8 weeks.

## 3. From pattern to learning methods (fixed mapping)

| Pattern | Primary methods Koach generates |
|---|---|
| **Visual** | **Memory palace** (personal rooms, vivid placements), mind-map cue sheets, timelines, maps/diagrams, colour-coded one-pagers (generated images for palace placements in v1.2) |
| **Auditory** | **Spoken cue sheets** (TTS audio per topic), **rhythmic chants and rhymes** read aloud, verbal mnemonics (acronym stories), listen-and-repeat drills, audio revision playlists for commutes |
| **Reading/Writing** | One-page cue sheets, cloze cards, **write-from-memory ("blurting")**, 3-line summaries |
| **Kinesthetic** | Drag-to-sequence drills (timelines, processes), build-the-flowchart, trace-on-map drills, teach-back prompts |
| **Everyone** | FSRS spaced repetition and a short "why" (first-principles) explanation on request |

**Mixing rule:** a learner's cue mix is about 60% strongest pattern, 25% second, 15% others, so weaker channels keep getting tested and can rise.

## Sources
- [Pashler et al. 2008: Learning Styles, Concepts and Evidence](https://pubmed.ncbi.nlm.nih.gov/26162104/)
- [Frontiers 2018 mini-review on modality learning styles](https://pmc.ncbi.nlm.nih.gov/articles/PMC6113575/)
- [Deans for Impact: Learning styles](https://deansforimpact.org/learning-styles-what-does-the-research-say/)
- [Method of loci meta-analysis (Twomey & Kroneisen 2021)](https://journals.sagepub.com/doi/10.1177/1747021821993457)
- [Method of loci systematic review 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12514325/)
- [Corsi vs. auditory span (QJEP)](https://journals.sagepub.com/doi/10.1080/17470210701774200)
- [What the Corsi task measures](https://studenttheses.uu.nl/handle/20.500.12932/999)
