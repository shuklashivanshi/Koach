import { describe, expect, it } from 'vitest';
import { pooledSuccess, readKb } from '../src';

const DATA = new URL('../data', import.meta.url).pathname;

describe('optional data on the committed files', () => {
  it('carries Political Science official rows end to end through readKb', async () => {
    const kb = await readKb(DATA);
    const psir = kb.optionals.find((o) => o.slug.startsWith('political-science'));
    expect(psir).toBeDefined();
    expect(psir?.stats).toHaveLength(6);
    const pooled = pooledSuccess(psir!.stats);
    expect(pooled.appeared).toBe(8927);
    expect(pooled.recommended).toBe(745);
    expect(pooled.smallSample).toBe(false);
  }, 60_000);
});
