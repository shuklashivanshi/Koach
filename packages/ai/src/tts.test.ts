import { describe, expect, it } from 'vitest';
import { synthesize, type TtsLike } from './tts';
import type { AiUsage } from './usage';

describe('synthesize', () => {
  it('requests en-IN MP3 and returns base64 audio with usage', async () => {
    let seen: Parameters<TtsLike['synthesizeSpeech']>[0] | undefined;
    const client: TtsLike = {
      synthesizeSpeech(req) {
        seen = req;
        return Promise.resolve([{ audioContent: new Uint8Array([1, 2, 3]) }]);
      },
    };
    const usages: AiUsage[] = [];
    const res = await synthesize(
      { feature: 'ping', text: 'Keep going.' },
      { client, onCall: (u) => void usages.push(u) },
    );
    expect(seen?.voice.languageCode).toBe('en-IN');
    expect(seen?.audioConfig.audioEncoding).toBe('MP3');
    expect(res.audioBase64).toBe(Buffer.from([1, 2, 3]).toString('base64'));
    expect(res.chars).toBe(11);
    expect(usages[0]).toMatchObject({ feature: 'ping', chars: 11 });
  });
});
