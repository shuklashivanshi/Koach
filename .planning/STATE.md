---
gsd_state_version: '1.0'
status: planning
progress:
  total_phases: 13
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-05)

**Core value:** Every day, Koach tells the aspirant exactly what to study, revise and practise next, and how to make it stick for them, backed by UPSC data.
**Current focus:** Phase 1: Foundation & GCP Deploy

## Current Position

Phase: 7 of 7 in milestone v1.0 (all phases built; data jobs finishing)
Status: v1.0 features built and tested locally on web; Phase 2 PYQ data (extraction → tagging) and optional data still running; not yet deployed (push to main needs the user's go-ahead)
Last activity: 2026-11-06: Phases 2–7 executed; 127 Vitest + 14 Jest green

Progress: [█████████░] v1.0 built; remaining: PYQ bank + tags, optional profiles/stats, tag audit by the user, deploy

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Expo RN + Fastify/TS on Cloud Run + Cloud SQL Postgres/pgvector + Vertex AI (speech on Google Cloud), region asia-south1
- [Init]: GSD mode YOLO, standard granularity, research/plan-check/verifier on
- [Planning]: v1.0 target ~3 Dec 2026 = Phases 1–7, incl. Optional Discovery (decision due 15 Dec 2026)
- [Planning]: Learning Pattern Test scores Visual/Auditory/Reading-Writing/Kinesthetic via games → strength profile; cue methods mapped from patterns; repetition + first-principles for all
- [Planning]: Naming rule: no teacher/institute/platform names in the app; books + official sources allowed; blocked-names filter
- [Planning]: App push only; Mains answers by photo or typing; no optional taster test; no generated music
- [Phase 1 planning]: Android first; Google + email code (Resend); Node 24; Expo SDK 58; koach-dev only; ₹2,000 budget
- [Phase 1]: Test on web + localhost first; the Android build and device check (01-07) come later
- [Phase 2]: PYQs from upsc.gov.in PDFs; reviewer = user via admin page; ~825 GS nodes; strategy KB seeded (86 claims)
- [Phase 2]: Official Prelims answer keys are not on upsc.gov.in for most years → answers are AI-solved twice and kept only when both agree, marked "model" (never shown as official)
- [Phase 3]: Learning Pattern Test after onboarding (Today card); spoken answers via Chirp (chirp_2 in asia-southeast1; asia-south1 has none for en-IN)
- [Phase 4]: Reminders via Web Push now (FCM later); Cloud Scheduler drives reminders every 15 min and CA ingest at 05:30 IST
- [Phase 1]: bulk/embed Gemini tiers use the global endpoint (not served in asia-south1); lite + TTS stay in asia-south1
- [Review]: Requirement IDs renumbered (MEM→LPT, ELEC→OPT, CUE and KB reordered); PROJECT.md declared the source of truth

### Pending Todos

None yet.

### Blockers/Concerns

- Resend refuses delivery (403) until a sending domain is verified; dev relies on the code echo in logs
- Rotate the Resend API key (it was shared in chat)
- UPSC subject-matter expert availability for knowledge-base review (Phase 2) is unconfirmed

## Deferred Items

- 01-07: EAS Android dev build + 8-step on-phone check. Needs `expo-dev-client` wiring (EAS reported it missing), `register-sha1.sh`, and the `.web.ts` local auth to stay web-only.
