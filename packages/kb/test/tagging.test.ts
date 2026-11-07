import { describe, expect, it } from 'vitest';
import type { PyqFile } from '../src/seed';
import { cleanTag, type RawTag, tagPaper } from '../src/tagging';

const valid = new Set(['gs2.polity.a', 'gs2.polity.b', 'gs2.polity.c', 'gs2.polity.d']);
const base = { questionType: 'statement', sourceType: 'static' } as const;
const tag = (number: number, ids: string[], extra: Partial<RawTag> = {}): RawTag => ({
  number,
  nodes: ids.map((id, i) => ({ id, primary: i === 0 })),
  ...base,
  ...extra,
});
const file = (exam: 'prelims' | 'mains', n: number): PyqFile => ({
  exam,
  paper: 'gs2',
  year: 2023,
  sourceUrl: 'https://upsc.gov.in/x.pdf',
  questions: Array.from({ length: n }, (_, i) => ({ number: i + 1, text: `Question ${i + 1}?` })),
});

describe('cleanTag', () => {
  it('drops unknown ids and duplicates, keeps the primary the model chose (exactly one) and at most three nodes', () => {
    const res = cleanTag(
      {
        ...tag(1, [
          'nope',
          'gs2.polity.a',
          'gs2.polity.a',
          'gs2.polity.b',
          'gs2.polity.c',
          'gs2.polity.d',
        ]),
        nodes: [
          { id: 'nope', primary: true },
          { id: 'gs2.polity.a', primary: false },
          { id: 'gs2.polity.a', primary: true },
          { id: 'gs2.polity.b', primary: true },
          { id: 'gs2.polity.c', primary: false },
          { id: 'gs2.polity.d', primary: false },
        ],
      },
      'prelims',
      valid,
    );
    expect('tag' in res && res.tag.nodes).toEqual([
      { id: 'gs2.polity.a', primary: false },
      { id: 'gs2.polity.b', primary: true },
      { id: 'gs2.polity.c', primary: false },
    ]);
  });

  it('rejects when no node id is in the graph, naming the bad ids', () => {
    expect(cleanTag(tag(1, ['made.up.id']), 'prelims', valid)).toEqual({
      rejected: 'unknown node ids: made.up.id',
    });
  });

  it('needs a directive for Mains only, and lowercases it', () => {
    expect(cleanTag(tag(1, ['gs2.polity.a']), 'mains', valid)).toEqual({
      rejected: 'missing directive word',
    });
    const m = cleanTag(
      tag(1, ['gs2.polity.a'], { directive: ' Critically Examine ' }),
      'mains',
      valid,
    );
    expect('tag' in m && m.tag.directive).toBe('critically examine');
    const p = cleanTag(tag(1, ['gs2.polity.a'], { directive: 'discuss' }), 'prelims', valid);
    expect('tag' in p && p.tag.directive).toBeUndefined();
  });
});

describe('tagPaper', () => {
  it('re-asks only the rejected questions, with the reason, and then tags them', async () => {
    const calls: { numbers: number[]; notes: [number, string][] }[] = [];
    const res = await tagPaper(file('prelims', 5), valid, (batch, notes) => {
      calls.push({ numbers: batch.map((q) => q.number), notes: [...notes] });
      return Promise.resolve(
        batch.map((q) =>
          calls.length === 1 && q.number === 3
            ? tag(q.number, ['hallucinated.id'])
            : tag(q.number, ['gs2.polity.b']),
        ),
      );
    });
    expect(calls.map((c) => c.numbers)).toEqual([[1, 2, 3, 4, 5], [3]]);
    expect(calls[1]?.notes).toEqual([[3, 'unknown node ids: hallucinated.id']]);
    expect(res.failed).toEqual([]);
    expect(res.tags.map((t) => t.pyqId)).toEqual([
      'pre-2023-gs2-q001',
      'pre-2023-gs2-q002',
      'pre-2023-gs2-q003',
      'pre-2023-gs2-q004',
      'pre-2023-gs2-q005',
    ]);
  });

  it('gives up after the retry budget and reports what stayed untagged', async () => {
    let n = 0;
    const res = await tagPaper(
      file('mains', 2),
      valid,
      (batch) => {
        n++;
        return Promise.resolve(
          batch.map((q) =>
            q.number === 2 ? tag(2, ['bad']) : tag(1, ['gs2.polity.a'], { directive: 'discuss' }),
          ),
        );
      },
      { maxRetries: 1 },
    );
    expect(n).toBe(2);
    expect(res.tags.map((t) => t.pyqId)).toEqual(['mains-2023-gs2-q001']);
    expect(res.failed).toEqual([{ number: 2, reason: 'unknown node ids: bad' }]);
  });

  it('ignores tags for question numbers that do not exist', async () => {
    const res = await tagPaper(file('prelims', 1), valid, () =>
      Promise.resolve([tag(1, ['gs2.polity.a']), tag(99, ['gs2.polity.a'])]),
    );
    expect(res.tags).toHaveLength(1);
  });
});
