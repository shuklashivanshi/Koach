// Live check: synthesise a short list with TTS and transcribe it back with Chirp.
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/ai exec tsx scripts/stt-check.ts
import { synthesize } from '../src/tts';
import { transcribe } from '../src/stt';

const s = await synthesize({ feature: 'check', text: 'monsoon, delta, plateau, estuary, lagoon' });
const t = await transcribe({ feature: 'check', audioBase64: s.audioBase64, seconds: 4 });
console.log('TRANSCRIPT:', t.text);
