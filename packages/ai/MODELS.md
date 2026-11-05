# Model availability

**Pending live check.** Run once the koach-dev project exists (plan 01-05, task 1):

```
GCP_PROJECT=<project-id> pnpm --filter @koach/ai check-models
```

| Tier | Model | Working location | Note |
|---|---|---|---|
| bulk | `gemini-3.8-flash` | pending | |
| lite | `gemini-3.5-flash-lite` | pending | |
| embed | `gemini-embedding-2` | pending | |

**TTS voice:** `en-IN-Chirp3-HD-Aoede`, pending.

**Pricing in `src/models.config.ts` is an estimate** (`verified: false`) until checked against the
Vertex AI pricing page.
