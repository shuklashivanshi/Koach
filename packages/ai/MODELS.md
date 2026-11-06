# Model availability

Checked 2026-11-06 against project `koach-dev-8cf0a5` by `scripts/check-models.ts`.

| Tier | Model | Working location | Note |
|---|---|---|---|
| bulk | `gemini-3.8-flash` | global | not served in asia-south1 |
| lite | `gemini-3.5-flash-lite` | asia-south1 |  |
| embed | `gemini-embedding-2` | global | not served in asia-south1 |

**TTS voice:** `en-IN-Chirp3-HD-Aoede` available (en-IN Chirp HD voices: en-IN-Chirp3-HD-Achernar, en-IN-Chirp3-HD-Achird, en-IN-Chirp3-HD-Algenib, en-IN-Chirp3-HD-Algieba, en-IN-Chirp3-HD-Alnilam, en-IN-Chirp3-HD-Aoede, en-IN-Chirp3-HD-Autonoe, en-IN-Chirp3-HD-Callirrhoe, en-IN-Chirp3-HD-Charon, en-IN-Chirp3-HD-Despina, en-IN-Chirp3-HD-Enceladus, en-IN-Chirp3-HD-Erinome, en-IN-Chirp3-HD-Fenrir, en-IN-Chirp3-HD-Gacrux, en-IN-Chirp3-HD-Iapetus, en-IN-Chirp3-HD-Kore, en-IN-Chirp3-HD-Laomedeia, en-IN-Chirp3-HD-Leda, en-IN-Chirp3-HD-Orus, en-IN-Chirp3-HD-Puck, en-IN-Chirp3-HD-Pulcherrima, en-IN-Chirp3-HD-Rasalgethi, en-IN-Chirp3-HD-Sadachbia, en-IN-Chirp3-HD-Sadaltager, en-IN-Chirp3-HD-Schedar, en-IN-Chirp3-HD-Sulafat, en-IN-Chirp3-HD-Umbriel, en-IN-Chirp3-HD-Vindemiatrix, en-IN-Chirp3-HD-Zephyr, en-IN-Chirp3-HD-Zubenelgenubi).

If a tier works only on `global`, set its `location` to `'global'` in `src/models.config.ts`.
Prompts never contain personal data, so the global endpoint is acceptable for these calls.

## Speech-to-Text (checked live 2026-11-06)

| Region | chirp_3 | chirp_2 | chirp / long |
|---|---|---|---|
| asia-south1 | not GA for en-IN | not served | not served / not GA |
| asia-southeast1 | not GA for en-IN | **works** | — |
| asia-northeast1 | not GA | not GA | — |
| eu, us (multi-region) | works | not served | — |

Chosen: `chirp_2` in `asia-southeast1` (nearest working region). Audio is transient and never stored.
Override with `STT_MODEL` / `STT_LOCATION`. Check again with `scripts/stt-check.ts`.
