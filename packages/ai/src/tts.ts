import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { ttsCostUsd } from './cost';
import { tts } from './models.config';
import { withRetry } from './retry';
import { logUsage, type OnCall } from './usage';

export interface TtsLike {
  synthesizeSpeech(req: {
    input: { text: string };
    voice: { languageCode: string; name: string };
    audioConfig: { audioEncoding: 'MP3' };
  }): Promise<[{ audioContent?: Uint8Array | string | null }, ...unknown[]]>;
}

let defaultClient: TtsLike | undefined;
const ttsClient = (): TtsLike => (defaultClient ??= new TextToSpeechClient() as unknown as TtsLike);

export interface SpeechResult {
  audioBase64: string;
  chars: number;
  costUsd: number;
}

/** Text-to-speech (D-18): en-IN voice, MP3, base64 for the app. */
export async function synthesize(
  req: { feature: string; text: string; uid?: string | null },
  opts: { client?: TtsLike; onCall?: OnCall } = {},
): Promise<SpeechResult> {
  const client = opts.client ?? ttsClient();
  const started = Date.now();
  const [res] = await withRetry(() =>
    client.synthesizeSpeech({
      input: { text: req.text },
      voice: { languageCode: tts.languageCode, name: tts.voice },
      audioConfig: { audioEncoding: tts.audioEncoding },
    }),
  );
  const audio = res.audioContent ?? '';
  const audioBase64 = typeof audio === 'string' ? audio : Buffer.from(audio).toString('base64');
  const chars = req.text.length;
  const result = { audioBase64, chars, costUsd: ttsCostUsd(chars) };
  const usage = {
    feature: req.feature,
    uid: req.uid ?? null,
    model: tts.voice,
    inputTokens: 0,
    outputTokens: 0,
    chars,
    costUsd: result.costUsd,
    latencyMs: Date.now() - started,
  };
  logUsage(usage);
  await opts.onCall?.(usage);
  return result;
}
