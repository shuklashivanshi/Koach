<!-- GSD:project-start source:PROJECT.md -->

## Project

**Koach**

Koach is a mobile-first (React Native + TypeScript) AI coach for the UPSC Civil Services Exam. Every day it decides what the aspirant should study, revise and practise, and **where to read it from**. It links current affairs to the static syllabus and prioritises topics using past-paper (PYQ) analysis and topic prediction. It finds each aspirant's **learning pattern** (visual, auditory, reading/writing, kinesthetic) through a short game-based test, then turns material into memory cues that suit that pattern: memory palace, spoken cue sheets and chants, mnemonics, written cue sheets, hands-on drills, plus spaced repetition and first-principles "why" for everyone. It also helps aspirants **choose their optional** and, later, their **service preferences**. Its teaching follows proven UPSC pedagogy patterns (PYQ-first learning, active recall, map-based learning, mistake logs). It is built first for Shivanshi's own CSE 2027 attempt (working, 3–5 study hrs/day) and designed multi-user so it can later serve UPSC aspirants broadly.

**Core Value:** Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data (official syllabus, PYQs, measured recall). If everything else fails, the daily plan + spaced-revision engine must work.

### Constraints

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

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
