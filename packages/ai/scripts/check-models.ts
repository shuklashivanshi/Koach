// Live check (needs ADC + GCP_PROJECT): which location serves each configured model, and which
// en-IN Chirp HD voice exists. Writes the results to MODELS.md. Run after infra bootstrap:
//   GCP_PROJECT=<id> pnpm --filter @koach/ai check-models
import { writeFileSync } from 'node:fs';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { tiers, tts, type Tier } from '../src/models.config';

const project = process.env.GCP_PROJECT;
if (!project) throw new Error('Set GCP_PROJECT');

async function probe(tier: Tier, model: string, location: string): Promise<string | null> {
  const ai = new GoogleGenAI({ vertexai: true, project, location });
  try {
    if (tier === 'embed') await ai.models.embedContent({ model, contents: 'ping' });
    else await ai.models.generateContent({ model, contents: 'Reply with: ok' });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message.slice(0, 120) : String(err);
  }
}

const rows: string[] = [];
for (const [tier, choice] of Object.entries(tiers) as [Tier, (typeof tiers)[Tier]][]) {
  const regional = await probe(tier, choice.model, choice.location);
  let works = regional ? null : choice.location;
  let note = '';
  if (regional) {
    const global = await probe(tier, choice.model, 'global');
    works = global ? null : 'global';
    note = global ? `regional: ${regional}; global: ${global}` : `not served in ${choice.location}`;
  }
  rows.push(`| ${tier} | \`${choice.model}\` | ${works ?? 'FAILED'} | ${note} |`);
  console.log(tier, choice.model, '→', works ?? 'FAILED', note);
}

const [voices] = await new TextToSpeechClient().listVoices({ languageCode: tts.languageCode });
const chirp = (voices.voices ?? [])
  .map((v) => v.name ?? '')
  .filter((n) => n.includes('Chirp3-HD'))
  .sort();
const voiceOk = chirp.includes(tts.voice);
console.log('voice', tts.voice, voiceOk ? 'available' : `missing; options: ${chirp.join(', ')}`);

writeFileSync(
  new URL('../MODELS.md', import.meta.url),
  `# Model availability

Checked ${new Date().toISOString().slice(0, 10)} against project \`${project}\` by \`scripts/check-models.ts\`.

| Tier | Model | Working location | Note |
|---|---|---|---|
${rows.join('\n')}

**TTS voice:** \`${tts.voice}\` ${voiceOk ? 'available' : '**missing**'} (en-IN Chirp HD voices: ${chirp.join(', ') || 'none'}).

If a tier works only on \`global\`, set its \`location\` to \`'global'\` in \`src/models.config.ts\`.
Prompts never contain personal data, so the global endpoint is acceptable for these calls.
`,
);
