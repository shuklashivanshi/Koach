import { describe, expect, it } from 'vitest';
import { checkText, findHits, scrub } from './index';

describe('naming guard', () => {
  it('flags institutes, platforms and educators in any casing or punctuation', () => {
    expect(checkText('Notes from Vision IAS')).toEqual(['vision ias']);
    expect(checkText('as taught by SHIVIN-CHAUDHARY')).toContain('shivin chaudhary');
    expect(checkText("Rau's IAS test")).toContain('rau s ias');
    expect(checkText('watch on Unacademy')).toContain('unacademy');
    expect(checkText('BYJU’S')).toContain('byju');
  });

  it('allows ordinary words, official bodies and book authors', () => {
    for (const ok of [
      'A clear vision for the Indian economy',
      'Insights from the Economic Survey',
      'Lal Bahadur Shastri National Academy of Administration',
      'Indian Polity by M. Laxmikanth, Ch 7',
      'Read NCERT Class 11 Geography, Ch 2',
      'Drishti means sight',
      'coaching for the exam',
    ]) {
      expect(checkText(ok), ok).toEqual([]);
    }
  });

  it('finds hits deep in objects and scrubs them', () => {
    const value = { a: [{ reason: 'Use Vision IAS notes' }], b: 'fine', n: 3 };
    expect(findHits(value)).toEqual([{ path: '$.a[0].reason', names: ['vision ias'] }]);
    expect(scrub(value)).toEqual({ a: [{ reason: 'Use [source] notes' }], b: 'fine', n: 3 });
  });
});
