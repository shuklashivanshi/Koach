---
scope: app-wide design contract
status: draft
theme: Light Academia
default_mode: light
created: "2026-11-05"
---

# Koach — UI Spec (Design Contract)

> *Like studying by a sunlit window in an old library.* Calm, scholarly, unhurried.
> This is the app-wide contract. Per-phase UI specs (`/gsd-ui-phase N`) inherit from it and may only add to it, not override it.
> Feature behaviour is defined in `.planning/PROJECT.md`; this file defines how it looks and reads. Screens marked *(v1.1)* / *(v1.2)* ship in later milestones.

---

## 1. Principles

1. **One thing per screen.** Each screen has one primary action. Everything else is quiet.
2. **Fewer words.** Headings ≤ 4 words. Body copy ≤ 2 short lines. Use numbers instead of sentences ("12 due", not "You have 12 cards due for revision").
3. **Reasoning on request.** The coach's "why" is always one tap away (`Why?`), never shown by default.
4. **Paper, not glass.** Flat cream surfaces, hairline rules, soft shadows. No gradients except sunlight, no glassmorphism, no neon.
5. **Slow and gentle.** Motion is soft and short. Nothing blinks, bounces or shouts. No red badges.
6. **Serif with purpose.** Display serif for moments, reading serif for everything else.
7. **Light by default.** Light mode ships as the default. "Lamplight" dark mode is optional, switched in settings or by following the system setting.

---

## 2. Design System

| Property | Value |
|----------|-------|
| Platform | React Native (Expo) + TypeScript |
| Tool | none (custom tokens in `packages/ui/theme.ts`) |
| Component library | Custom primitives on React Native core + `react-native-reanimated` + `@gorhom/bottom-sheet` |
| Icon library | `phosphor-react-native`: **Light** weight only, 24px, ink or muted colour |
| Fonts | **Cormorant Garamond** (display) + **Literata** (text/UI), via `@expo-google-fonts/*` |
| Texture | `paper-grain.png` noise overlay, 4% opacity, on the app background only |
| Illustration | Monochrome sepia line engravings (see §8) |

---

## 3. Color

### Light: "Summer Library" (default)

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Dominant (60%) | `parchment` | `#F5EFE4` | App background |
| Secondary (30%) | `cream` | `#FBF8F2` | Cards, sheets, inputs |
| Secondary | `linen` | `#ECE3D2` | Tab bar, chips, selected rows, progress track |
| Rule | `hairline` | `#DCD0BC` | 1px dividers, card borders (non-text) |
| Text | `ink` | `#3A2E24` | Primary text, icons (11.5:1 on parchment) |
| Text | `inkMuted` | `#6B5B4E` | Secondary text, captions (5.7:1) |
| Accent (10%) | `leather` | `#8A5A3B` | Primary button, active tab, current-task bookmark, links (5.1:1) |
| Success | `sage` | `#5A6A4A` | Done ticks, mastery "strong", correct answer (≥4.6:1) |
| Highlight | `gilt` | `#9C7A3C` | Streak flame, "High likelihood" tag. **Decorative or ≥18px text only** (3.5:1) |
| Destructive | `rosewood` | `#9E3F35` | Wrong answer, delete account. Nothing else (5.7:1) |
| Plaid | `plaid` | `#C9B79C` @ 25% | Optional tartan pattern on the profile header only |

**Accent (`leather`) is reserved for:** the primary button, active tab icon/label, the bookmark ribbon on the current task, inline links, and progress fill. It is **never** used for headings, card backgrounds or more than one button per screen.

### Dark: "Lamplight" (opt-in)

| Token | Hex |
|-------|-----|
| `parchment` | `#211A14` |
| `cream` | `#2B231B` |
| `linen` | `#3A3026` |
| `hairline` | `#4A3E32` |
| `ink` | `#EDE3D1` |
| `inkMuted` | `#B3A28C` |
| `leather` | `#D2A57A` (button text `#211A14`) |
| `sage` | `#A9B892` |
| `gilt` | `#D9B872` |
| `rosewood` | `#E08A7C` |

All text pairs meet WCAG AA (≥4.5:1). Checked 2026-11-05.

### Sunlight

The Today header carries a very soft radial "window light" that follows the time of day. It is the only gradient in the app.

| Time | Gradient (top-left → transparent) |
|------|------|
| 05–11 | `#FFF3D6` @ 60% (morning sun) |
| 11–17 | `#FFF8EA` @ 40% (noon) |
| 17–21 | `#F6DFC0` @ 55% (golden hour) |
| 21–05 | none; a small brass desk-lamp glyph appears instead |

---

## 4. Typography

| Role | Font | Size | Weight | Line height | Use |
|------|------|------|--------|-------------|-----|
| Display | Cormorant Garamond | 34 | 600 | 1.15 | Screen titles on Today/onboarding, results moments |
| Heading | Cormorant Garamond | 24 | 600 | 1.2 | Section and card titles |
| Title | Literata | 17 | 600 | 1.35 | Task names, question stems |
| Body | Literata | 16 | 400 | 1.55 | Explanations, cues, summaries |
| Label | Literata | 13 | 500 | 1.3 | Buttons, chips, metadata; **small caps + 0.6 letter-spacing** for overlines |
| Caption | Literata | 12 | 400 italic | 1.4 | Sources, timestamps, "Why?" footnotes |
| Numeral | Literata (`tabular-nums`, `lining-nums`) | 28 / 17 | 500 | 1.1 | Counts, timers, scores |

Rules: max 2 weights per screen. Never use Cormorant below 20px. Respect OS Dynamic Type up to 130%, then wrap rather than truncate. Italics only for captions and quotes.

---

## 5. Spacing, Shape, Elevation

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4 | Icon-to-text gap |
| sm | 8 | Inside chips, between stacked labels |
| md | 16 | Default padding, **screen side gutter** |
| lg | 24 | Card padding, between cards |
| xl | 32 | Between sections |
| 2xl | 48 | Top of screen to title |
| 3xl | 64 | Onboarding vertical breathing room |

- **Radius:** cards 12, buttons 10, chips 999 (pill), sheets 20 (top only). Flashcards use 6 to look like index cards.
- **Elevation:** one level only: `shadow #3A2E24 @ 6%, y 2, blur 8`. Sheets add a 1px `hairline` top border instead of a heavier shadow.
- **Touch targets:** ≥ 44×44.
- **Grid:** single column; content max width 560 (tablets centre it).

---

## 6. Motion

| Interaction | Spec |
|---|---|
| Screen push | Fade + 8px rise, 240ms, `easeOutCubic` |
| Bottom sheet | Spring (damping 20, stiffness 180) |
| Task complete | Ink fills the circle (200ms), row text fades to `inkMuted`, gentle haptic (`selection`) |
| Flashcard flip | Page-turn `rotateY` 180°, 380ms |
| Progress | Width/arc animates over 600ms |
| Reduce Motion on | All of the above become 150ms cross-fades; no flips |

No confetti. Milestones are marked with a gilt wax-seal glyph that fades in.

---

## 7. Components

| Component | Description |
|---|---|
| `PaperCard` | `cream` surface, 1px `hairline` border, radius 12, padding 24 |
| `TaskRow` | Empty ink circle → filled on done · title (Title) · one caption line (`Laxmikanth · Ch 22 · 40 min`). The current task gets a `leather` bookmark ribbon on the left edge. Swipe right = done, swipe left = later |
| `Overline` | Small-caps label (`TODAY · 3 OF 5`) |
| `Button/Primary` | `leather` fill, `cream` text, height 52, full width at the bottom of the screen. Max one per screen |
| `Button/Secondary` | Transparent, 1px `ink` @ 30% border |
| `Button/Text` | `leather` text, no border (`Why?`, `Skip`) |
| `Chip` | `linen` pill, Label text; subject tags (`POLITY`) |
| `Stat` | Numeral + Label stacked (`12` / `DUE`) |
| `ProgressThread` | 2px line on a `linen` track, `leather` fill, like a bookmark ribbon |
| `MasteryDots` | 5 small dots, filled in `sage` |
| `IndexCard` | Flashcard: `cream`, faint ruled lines (`hairline` @ 50%), radius 6, slight 0.5° tilt |
| `QuizOption` | Bordered row with an A–D letter in Cormorant. Correct → `sage` border + tick; wrong → `rosewood` border |
| `MarginNote` | Toast in the style of a handwritten margin note: italic caption, `linen`, slides from the bottom, auto-dismisses after 3s |
| `WhySheet` | Bottom sheet with the reasoning and source links (Caption) |
| `CueTabs` | Segmented control: `See · Hear · Write · Do · Why`, opening on the strongest pattern |
| `AudioCue` | Brass play/pause button, speed chips `1× · 1.25× · 1.5×`, rhythm-line text below; works with the screen locked |
| `EmptyState` | Engraving (120px) + one line heading + one line body + optional text button |
| `CauseChips` | After a wrong answer: `Didn't know · Misread · Eliminated wrong · Guessed`, one tap, optional |
| `Heatmap` | Grid of syllabus subjects × topics, cells shaded `linen` → `sage` by mastery; tap a cell → node page |
| `LikelihoodTag` *(v1.1)* | Small-caps tag `HIGH` in `gilt` / `MEDIUM` / `LOW` in `inkMuted`, with `Why?` |

---

## 8. Imagery & Motifs

- **Engravings** (sepia line art, single colour `inkMuted` @ 70%, transparent background): open book, window with sunlight, arched library corridor, rolling hills with a tree line, a bust/column, a desk lamp, a quill, a wax seal.
- **Where:** onboarding (one per step), empty states, Learning Pattern Test intro, milestone moments. **Never** inside lists or task screens.
- **Plaid:** a faint tartan pattern only behind the profile header.
- **No photos, no emoji in the UI chrome, no stock illustrations.**
- **App icon:** cream background with a leather-brown serif "K" set inside a library arch.

---

## 9. Navigation

Four tabs, labelled in small caps and using Phosphor Light icons:

| Tab | Icon | Holds |
|---|---|---|
| **Today** | `Sun` | Daily plan, Learn sessions, CA quiz |
| **Revise** | `Cards` | Due flashcards and revision units, audio playlist, mistakes notebook, memory palace |
| **Library** | `Books` | Syllabus tree, node pages (source, PYQs, recent CA), heatmap, Optional Discovery |
| **You** | `Feather` | Week summary, coach note, learning profile, settings |

Contextual help opens as a bottom sheet from inside screens: `Make it stick` (cues), `Why?` (reasoning) and `Short on time?` (replan). There is no floating button and no chat tab. The Decision Coach (10.11) is the only conversational surface, also a sheet.

---

## 10. Screens (v1.0)

Wireframes show structure only. Copy shown is the actual copy.

### 10.1 Welcome
```
        [engraving: sunlit window]

            Koach
     Study, with a quiet mind.

   [ Continue with Google ]        ← primary
      Use email instead           ← text button
```

### 10.2 Onboarding (5 steps, one question each)
Progress: `ProgressThread` at the top, `Back` text button.
1. **Your attempt**: `CSE 2027` preselected (`Prelims · 23 May`)
2. **Your hours**: 7 weekday rows with a stepper (`Mon  2h 30m`), a `Copy to weekdays` text button, then work and quiet hours
3. **Where you stand**: subject list with 3-state chips `New · Some · Strong`
4. **A short check**: 20 questions, one per screen, `Skip` allowed (skipping builds a starter plan from step 3)
5. **How you learn**: intro to the Learning Pattern Test (`4 short games · 15 min`) → `Begin`

### 10.3 Learning Pattern Test
Four games, one per screen, then a delayed round. Overline `GAME 2 OF 4`; a thin `ProgressThread` timer; no score shown until the end.
- **Map Pins** (visual): sepia outline map, places appear for 20s, then drag pins back.
- **Pattern Grid** (visual): cream grid, `leather` cells flash, tap to recreate.
- **Listen & Recall** (auditory): a large brass play button (plays once), then a text field or a mic button (`Say it`).
- **Read & Write Back** (reading/writing): passage on a `PaperCard` for 60s, then a ruled writing field.
- **Arrange & Trace** (kinesthetic): drag `IndexCard`s into order; trace a river with a finger on the map.
- **Results:** Display `How you learn`, four horizontal bars (Visual, Auditory, Reading/Writing, Kinesthetic, 0–100), with the strongest bar in `leather` and the others in `inkMuted`. One line: *"Pictures and places stick best for you."* `Why?` shows raw scores; text button `Retake later`.

### 10.4 Today *(home)*
```
 [sunlight]
 THURSDAY · 5 NOV                     ☀
 Good morning, Shivanshi            ← Display
 199 days to Prelims · 3h 30m today ← Caption

 ┃○ Parliament: Money Bills          ← bookmark = current
 ┃  Laxmikanth · Ch 22 · 40 min
  ○ Revise: Fundamental Rights
    18 cards · 20 min
  ○ Current affairs quiz
    8 questions · 10 min
  ○ PYQs: Modern History
    15 questions · 25 min

 ─────────────────
 Short on time?                     ← text button → Replan sheet

 [ Begin ]                          ← primary, starts the current task
```
- Done tasks drop to the bottom and turn muted. There's no separate "done" list.
- Long-press a task → `Why this?` · `Later` · `Swap`.
- After a nightly rebalance, a single `MarginNote` appears: *"2 tasks moved to Saturday."* (tap → why).

### 10.5 Learn Session (PYQ-first)
Three short steps, one per screen, with a `ProgressThread` at the top:
1. **How it's asked:** overline `POLITY · LEARN`, Heading (node name), 2–3 PYQs as compact `PaperCard`s (year as Caption). Primary `Got it`.
2. **Read:** goal line in Title (`Finish Ch 22 + 5 PYQs`), source line `Laxmikanth, Indian Polity · Ch 22 · pp. 230–244`, a large Numeral timer, text buttons `Pause` / `Make it stick`. Primary `Done reading`.
3. **Check:** 3–5 quick questions (`QuizOption`); a wrong answer shows `CauseChips`. Ends with a one-tap rating `Easy · Okay · Hard` and `Done`.

### 10.6 Replan Sheet
Heading `How much time today?` → chips `30m · 1h · 2h · Custom` → preview of the trimmed list → `Use this plan`.

### 10.7 Revise
Top: three `Stat`s, `18 DUE · 4 NEW · 92% RETAINED`. Primary `Start revision`.
Below, quiet rows: `Listen` (audio revision playlist, `AudioCue` controls, works with the screen locked) · `Mistakes` (notebook grouped by cause, with a monthly `Recurring traps` summary) · `Memory palace` (your rooms and what lives in them).
Session: `IndexCard` front → tap to turn → back → `Again · Hard · Good · Easy` (FSRS grades, in Label size). `Make it stick` opens the Cue sheet for that card.

### 10.8 Cue Sheet *(Make it stick)*
`CueTabs`, defaulting to the learner's strongest pattern (a small `gilt` dot marks "works best for you").
- **See** (visual): memory-palace placements (`Living room → by the bookshelf …`), or a mind-map / timeline cue sheet
- **Hear** (auditory): `AudioCue` for a spoken cue sheet or chant; the mnemonic shown large (Cormorant 28) with its decode below
- **Write** (reading/writing): a one-page cue sheet, then `Write it from memory` → key points ticked `sage`, missed points listed
- **Do** (kinesthetic): drag-to-order cards or build-the-flowchart
- **Why** (everyone): 3–5 numbered causal steps, then `Say it in one line` → graded with a `sage`/`rosewood` caption

First use of **See** asks once to set up a memory palace: `Pick a place you know well` → chips `Home · Office · Route to work · Custom` → name 5–8 spots in order.

Footer: `ThumbsUp` / `ThumbsDown` (Phosphor light icons). Flashcard repetition stays in Revise.

### 10.9 Current Affairs Quiz
Overline `CURRENT AFFAIRS · 3 / 8`. Stem in Title. 4 `QuizOption`s. After answering, an explanation (≤3 lines), a source caption (`PIB · 4 Nov`) and a text link to the syllabus node; a wrong answer also shows `CauseChips`. Then `Next`. End screen: Numeral score + `Missed ones added to Revise.` A `Report a problem` text button sits under every explanation.

### 10.10 Library
Search field (`Search the syllabus`) → collapsible subject tree (Heading → rows with `MasteryDots`).
A `Heatmap` text button above the tree opens the mastery heatmap.
**Node page:** Heading, chips (`PRELIMS`, `MAINS GS-II`), `Read` (source + chapter), `Asked` (mini bar of PYQs by year), `In the news` (up to 3 recent CA items), `Your mastery`, buttons `Study now` (primary) / `Practice PYQs` (secondary). *(v1.1: `LikelihoodTag` beside the Heading.)*

### 10.11 Optional Discovery *(Library → Choose your optional)*
- **Fit Quiz:** one question per screen, chips + an optional short text field. Not a chat log.
- **Your fits:** ranked list of 5 rows (name, fit as `MasteryDots`, one-line reason), plus a `Surprising fits` section. Tap → explorer.
- **Explorer page:** Heading, `Stat` row (`~380 HRS · 42% GS OVERLAP · 8.1% SUCCESS`), a small band chart of success rate across years (with a `Few candidates` caption when the sample is small), `Read` (standard books, titles only), buttons `Compare` (secondary) and `Ask the coach` (text).
- **Compare:** 2–3 columns, one row per factor, the best value per row in `sage`.
- **Decision Coach:** bottom sheet, short exchanges, suggestion chips (`I'm an engineer…`, `Is it too long?`). The deadline appears as an overline: `DECIDE BY 15 DEC`.
- **Choose:** primary `Make it my optional` → confirmation → `Added to your plan.`

### 10.12 You
Plaid header strip, name, `Day 14 · 🔥 9` (the flame is a Phosphor `Flame` icon in `gilt`, not an emoji).
Sections (rows, no cards): `This week` (hours bar per day) · `Coach note` (Sunday note + well-being check-in) · `Learning profile` (four bars, `Retake`) · `Notifications` (types, times, tone `Calm · Firm · Cheerful`) · `Appearance (Light / Lamplight / System)` · `Export data` · `Delete account`.

---

## 11. Copywriting Contract

Voice: a kind, well-read mentor. Short, warm, never preachy. No exclamation marks except on a milestone. No "Oops", no "AI-powered", no emoji in copy.

**Naming rule (hard):** never show the name of a teacher, coaching institute, app, platform, channel or course anywhere: copy, `Why?` sheets, notifications, reasons or generated text. Standard books (title/author + chapter), NCERT and official sources (UPSC, PIB, PRS, ministries, RBI/SEBI, Economic Survey, DoPT) may be named. A book whose title or author is an institute or platform is shown by a neutral label (`Environment reference · Ch 5`). Strategy reasons read "Based on 12 topper accounts", never a person or site. Generated text is filtered against a blocked-names list before display.

| Element | Copy |
|---|---|
| Primary CTA (Today) | `Begin` |
| Primary CTA (Revise) | `Start revision` |
| Task complete toast | `Done. Next: {task}` |
| Empty: nothing due | **All caught up.** / `Read something you love.` |
| Empty: plan not ready | **Setting your desk…** / `Your plan will be ready in a moment.` |
| Empty: no CA yet | **Today's paper isn't in yet.** / `Check back after 6 am.` |
| Offline | `Offline. Today's plan is saved.` |
| Error (generic) | `Couldn't reach the library. Try again.` |
| AI unavailable | `The coach is resting. Your plan still works.` |
| Missed day | `Yesterday moved to this week. Nothing lost.` |
| Destructive confirm | **Delete account**: `This erases your plan, notes and history. It can't be undone.` → `Delete` (rosewood) / `Keep` |
| Nudge examples | `Twenty minutes of Polity before dinner?` · `9-day streak. One short review keeps it.` · `Economy's first pass is due in 9 days.` |
| Weekly coach note | **Your week** · 3 lines max: kept / slipped / one change |
| Well-being check-in | **How heavy did this week feel?** · chips `Light · Fine · Heavy` (Heavy → `Next week is lighter.`) |
| Learning profile line | One sentence naming the strongest pattern, e.g. `Pictures and places stick best for you.` Never "You are a visual learner" |

Notification titles ≤ 30 characters, bodies ≤ 60.

---

## 12. UI State Coverage

| Category | Element(s) | Status | Resolution |
|---|---|---|---|
| empty | Today, Revise, CA quiz | ✅ covered | Copy in §11; engraving + one line each |
| loading | All lists | ✅ covered | Skeleton rows in `linen` with a slow 1.2s shimmer; no spinners except inside buttons |
| error | Network / AI | ✅ covered | §11 copy; deterministic plan always renders from cache |
| offline | Today, Revise | ✅ covered | Cached plan + due cards; banner `Offline…`; actions queue and sync |
| partial | Plan built but CA pipeline failed | ✅ covered | CA task hidden; `MarginNote` explains |
| zero-one-many | Task list (0 / 1 / 8+) | ✅ covered | 0 → empty state; 1 → no list chrome; >6 → `+3 more` collapse |
| long-text | Node names, question stems | ✅ covered | Wrap to 3 lines max in rows, full text on detail; never ellipsize stems |
| overflow | Dynamic Type 130%+ | 🧪 backstop | Visual test at largest size on a 5" Android screen |
| first-run | Before diagnostic | ✅ covered | Today shows a starter plan from self-assessment |

---

## 13. Accessibility

- WCAG AA contrast for all text (checked above). `gilt` is never used for text under 18px.
- Every icon-only control has an `accessibilityLabel`. The current task announces "current".
- Quiz answer feedback uses an icon + text as well as colour.
- Supports Dynamic Type, Reduce Motion and screen readers (VoiceOver/TalkBack order follows the visual order).

---

## 14. Implementation Notes

- Tokens live in `packages/ui/theme.ts` (`colors.light`, `colors.lamplight`, `type`, `space`, `radius`, `motion`). Screens never use raw hex values or pixel numbers.
- `useTheme()` reads the user's setting (`light` default, `lamplight`, `system`).
- Fonts are loaded with `expo-font` before the splash screen hides. The fallback is the system serif (Georgia/Noto Serif).
- Engravings are SVGs tinted via `currentColor`, kept in `packages/ui/art/`.

## Checker Sign-Off

- [ ] Copywriting · [ ] Visuals · [ ] Color · [ ] Typography · [ ] Spacing · [ ] States · [ ] Accessibility

**Approval:** pending
