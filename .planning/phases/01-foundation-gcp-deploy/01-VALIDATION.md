---
phase: "1"
slug: "foundation-gcp-deploy"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-06"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (packages, api) + jest-expo (mobile); PGlite for DB tests; ShellCheck for infra |
| **Config file** | `vitest.workspace.ts`, `apps/mobile/jest.config.js` (both created in Wave 1–2) |
| **Quick run command** | `pnpm vitest run --changed` |
| **Full suite command** | `pnpm -r typecheck && pnpm lint && pnpm test && pnpm --filter @koach/ai eval` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** run the quick command
- **After every plan wave:** run the full suite
- **Before `/gsd-verify-work`:** full suite green + `infra/verify.sh dev` + `infra/smoke.sh dev`
- **Max feedback latency:** 90 seconds (local); cloud steps are excluded

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PLAT-03, PLAT-04 | — | N/A | unit (PGlite) | `pnpm vitest run packages/db packages/shared` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | PLAT-03 | — | N/A | unit | `pnpm vitest run packages/ui` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | PLAT-01 | T-1-01 | Secrets never echoed | lint | `shellcheck infra/*.sh` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | PLAT-01 | T-1-01 | Least-privilege SAs | infra check | `infra/verify.sh dev` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | AUTH-01 | T-1-02 | 401 without valid ID token | integration | `pnpm --filter @koach/api test -- me.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | AUTH-01 | T-1-03 | Hashed codes, rate limits, attempt cap, constant-time compare | integration | `pnpm --filter @koach/api test -- email-auth.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 2 | AUTH-03 | T-1-04 | Complete, idempotent deletion | integration | `pnpm --filter @koach/api test -- account.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 2 | PLAT-06 | — | N/A | unit | `pnpm --filter @koach/mobile test -- client.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-02 | 06 | 2 | AUTH-01, AUTH-02 | T-1-02 | 401 forces sign-out | component | `pnpm --filter @koach/mobile test -- auth-flow.test.tsx` | ❌ W0 | ⬜ pending |
| 1-06-03 | 06 | 2 | AUTH-03 | T-1-05 | Dev screen unreachable in non-dev builds | component | `pnpm --filter @koach/mobile test -- you.test.tsx` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 3 | PLAT-05 | — | No PII in prompts | unit | `pnpm --filter @koach/ai test` | ❌ W0 | ⬜ pending |
| 1-04-03 | 04 | 3 | PLAT-05 | — | N/A | eval | `pnpm --filter @koach/ai eval` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 4 | PLAT-02 | T-1-01 | Secrets via Secret Manager only | cloud | `gcloud builds submit ... && curl /healthz` | ❌ W0 | ⬜ pending |
| 1-05-03 | 05 | 4 | PLAT-02 | T-1-02 | Live 401/200 behaviour | e2e (live) | `infra/smoke.sh dev` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Threats

| ID | Threat | Mitigation |
|----|--------|------------|
| T-1-01 | Secret leakage (DB password, Resend key) via logs or git | Secret Manager only; `read -s`; grep checks; log redaction |
| T-1-02 | Unauthenticated access to user data | Firebase ID-token preHandler on all /v1 routes except email auth; tests |
| T-1-03 | Email-code brute force or enumeration | 6 digits, hashed + salted, 10-min TTL, 5 attempts, 3 starts / 15 min per email and IP, uniform 204 |
| T-1-04 | Incomplete deletion (DPDP) | Ordered, idempotent delete across GCS, DB and Firebase; test |
| T-1-05 | Dev-only endpoints/screens in prod | APP_ENV guards; fake verifier rejected in prod; dev screen gated |

---

## Wave 0 Requirements

- [ ] `vitest.workspace.ts` + PGlite test helper (`packages/db/src/testing.ts`) — 01-01 Task 1
- [ ] `apps/mobile/jest.config.js` with the jest-expo preset — 01-06 Task 1
- [ ] ShellCheck available (`brew install shellcheck`) — 01-02 Task 1

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google sign-in, persistence, email code, AI ping audio, export, delete on a physical Android phone | PLAT-06, AUTH-01..03 | Needs a real device, a real Google account and a real inbox | 01-07 Task 2 (8 steps), recorded in 01-DEVICE-CHECK.md |
| Billing account + CLI logins | PLAT-01 | Credentials stay with the user | 01-02 Task 2 |
| GitHub repo + Cloud Build App authorisation | PLAT-02 | Browser OAuth | 01-05 Task 2 |

---

## Validation Sign-Off

- [ ] All automated rows green
- [ ] `infra/verify.sh dev` and `infra/smoke.sh dev` green
- [ ] 01-DEVICE-CHECK.md all PASS
