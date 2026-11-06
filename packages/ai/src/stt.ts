import { v2 } from '@google-cloud/speech';
import { sttCostUsd } from './cost';
import { stt } from './models.config';
import { withRetry } from './retry';
import { logUsage, type OnCall } from './usage';

export interface SttLike {
  recognize(req: {
    recognizer: string;
    config: {
      autoDecodingConfig: Record<string, never>;
      languageCodes: string[];
      model: string;
    };
    content: string;
  }): Promise<
    [
      { results?: { alternatives?: { transcript?: string | null }[] | null }[] | null },
      ...unknown[],
    ]
  >;
}

let defaultClient: SttLike | undefined;
const sttClient = (): SttLike =>
  (defaultClient ??= new v2.SpeechClient(
    stt.location === 'global' ? {} : { apiEndpoint: `${stt.location}-speech.googleapis.com` },
  ) as unknown as SttLike);

/**
 * Speech-to-text for spoken answers (Chirp, en-IN; region in models.config). Audio is sent inline and never
 * stored. `seconds` is the clip length reported by the client, used for cost logging.
 */
export async function transcribe(
  req: { feature: string; audioBase64: string; seconds: number; uid?: string | null },
  opts: { client?: SttLike; onCall?: OnCall; project?: string } = {},
): Promise<{ text: string; costUsd: number }> {
  const project = opts.project ?? process.env.GCP_PROJECT;
  if (!project) throw new Error('GCP_PROJECT is not set');
  const client = opts.client ?? sttClient();
  const started = Date.now();
  const [res] = await withRetry(() =>
    client.recognize({
      recognizer: `projects/${project}/locations/${stt.location}/recognizers/_`,
      config: { autoDecodingConfig: {}, languageCodes: [stt.languageCode], model: stt.model },
      content: req.audioBase64,
    }),
  );
  const text = (res.results ?? [])
    .map((r) => r.alternatives?.[0]?.transcript ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const costUsd = sttCostUsd(req.seconds);
  const usage = {
    feature: req.feature,
    uid: req.uid ?? null,
    model: stt.model,
    inputTokens: 0,
    outputTokens: 0,
    chars: text.length,
    costUsd,
    latencyMs: Date.now() - started,
  };
  logUsage(usage);
  await opts.onCall?.(usage);
  return { text, costUsd };
}
