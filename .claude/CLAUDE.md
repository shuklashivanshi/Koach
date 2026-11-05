<!-- GSD:project-start source:PROJECT.md -->

## Project

**Koach**

Koach is a mobile-first (React Native + TypeScript) AI coach for the UPSC Civil Services Exam. It decides what to study, revise and practise each day and where to read it from, connects current affairs to the static syllabus, and turns material into memory cues (repetition, memory palace, mnemonics, first-principles explanations) tuned to how the individual learner actually retains information. It is built first for Shivanshi's own CSE 2027 attempt (working, 3–5 hrs/day) and designed multi-user so it can later serve UPSC aspirants broadly.

**Core Value:** Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for *them*, with the reasoning backed by UPSC data (official syllabus, PYQs, cited topper strategy). If everything else fails, the daily plan + spaced-revision engine must work.

### Constraints

- **Tech stack**: React Native (Expo) + TypeScript for mobile; TypeScript (Node 22, Fastify) backend — user requirement, one language end to end
- **Cloud**: Deploy on GCP (Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Scheduler, Secret Manager, Artifact Registry, Cloud Build); region `asia-south1` — user requirement + India data residency
- **AI**: All AI features use Vertex AI (Gemini Flash/Pro, Gemini embeddings, grounding; Imagen optional) — user requirement
- **Deploy**: `deploy.yaml` (Cloud Build) is the deploy entrypoint — user requirement
- **Timeline**: v1.0 usable on Shivanshi's phone by ~3 Dec 2026; the product must not delay her own preparation for Prelims 23 May 2027
- **Budget**: Scale-to-zero infrastructure; Vertex spend target < ~US$2 per active user per month
- **Privacy**: DPDP Act 2023 aligned (consent, export/delete, minimal PII, India region)
- **Trust**: Every factual AI output carries sources; generated MCQs pass a verifier before being shown
- **GCP**: No project exists yet; Phase 1 includes project/API/IAM bootstrap

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
