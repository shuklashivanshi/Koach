import { describe, expect, it } from 'vitest';
import type { SttLike } from './stt';
import { transcribe } from './stt';

describe('transcribe', () => {
  it('uses the regional Chirp recognizer and joins results', async () => {
    const calls: Parameters<SttLike['recognize']>[0][] = [];
    const client: SttLike = {
      recognize(req) {
        calls.push(req);
        return Promise.resolve([
          {
            results: [
              { alternatives: [{ transcript: 'monsoon  delta' }] },
              { alternatives: [{ transcript: 'plateau' }] },
            ],
          },
        ]);
      },
    };
    const res = await transcribe(
      { feature: 'lpt.listen', audioBase64: 'QUJD', seconds: 30 },
      { client, project: 'p1' },
    );
    expect(res.text).toBe('monsoon delta plateau');
    expect(calls[0]?.recognizer).toBe('projects/p1/locations/asia-southeast1/recognizers/_');
    expect(calls[0]?.config).toMatchObject({ languageCodes: ['en-IN'], model: 'chirp_2' });
    expect(res.costUsd).toBeGreaterThan(0);
  });
});
