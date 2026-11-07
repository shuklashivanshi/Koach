import { checkText, findHits } from '@koach/guard';
import { describe, expect, it } from 'vitest';
import { readKb } from '../src';
import { candidatePapers } from '../src/tagging';
import { pyqId } from '../src/seed';

const DATA = new URL('../data', import.meta.url).pathname;

// Checks on the committed tags (KB-02) and source map (KB-03). Tags are AI-suggested, so these
// tests check structure and rules, not correctness (the admin review audits that).
describe('PYQ tags', async () => {
  const kb = await readKb(DATA);
  const gs = kb.syllabus.filter((f) => !f.paper.startsWith('optional:'));
  const nodeById = new Map(gs.flatMap((f) => f.nodes.map((n) => [n.id, { ...n, paper: f.paper }])));
  const tagById = new Map(kb.tags.map((t) => [t.pyqId, t]));

  it('only uses node ids from the graph, and only study nodes of the right paper', () => {
    for (const f of kb.pyqs) {
      const allowed = new Set(candidatePapers(f));
      for (const q of f.questions) {
        const t = tagById.get(pyqId(f.exam, f.year, f.paper, q.number));
        for (const n of t?.nodes ?? []) {
          const node = nodeById.get(n.id);
          expect(node, `${f.exam} ${f.year} ${f.paper} Q${q.number}: ${n.id}`).toBeDefined();
          expect(node?.kind).toBe('node');
          expect(allowed.has(node?.paper ?? ''), `${n.id} in ${node?.paper}`).toBe(true);
        }
      }
    }
  });

  it('has 1-3 nodes with exactly one primary on every tag', () => {
    for (const t of kb.tags) {
      expect(t.nodes.length, t.pyqId).toBeGreaterThanOrEqual(1);
      expect(t.nodes.length, t.pyqId).toBeLessThanOrEqual(3);
      expect(t.nodes.filter((n) => n.primary).length, t.pyqId).toBe(1);
    }
  });

  it('tags every question of a paper once a paper has been tagged', () => {
    for (const f of kb.pyqs) {
      const ids = f.questions.map((q) => pyqId(f.exam, f.year, f.paper, q.number));
      const n = ids.filter((id) => tagById.has(id)).length;
      if (n > 0) expect(n, `${f.exam} ${f.year} ${f.paper}`).toBe(ids.length);
    }
  });

  it('uses descriptive for Mains and a directive on nearly every Mains tag', () => {
    const mains = kb.tags.filter((t) => t.pyqId.startsWith('mains'));
    for (const t of mains) expect(t.questionType, t.pyqId).toBe('descriptive');
    for (const t of kb.tags.filter((t) => t.pyqId.startsWith('pre'))) {
      expect(t.questionType, t.pyqId).not.toBe('descriptive');
      expect(t.directive, t.pyqId).toBeUndefined();
    }
    if (mains.length) {
      const withDirective = mains.filter((t) => t.directive).length;
      expect(withDirective / mains.length).toBeGreaterThanOrEqual(0.9);
    }
  });
});

describe('source map', async () => {
  const kb = await readKb(DATA);
  const leaves = kb.syllabus
    .filter((f) => !f.paper.startsWith('optional:'))
    .flatMap((f) => f.nodes.filter((n) => n.kind === 'node'));
  const sources = new Map(kb.sources.map((s) => [s.id, s]));

  it('gives every GS study node exactly one primary source, chapter and reason', () => {
    const counts = new Map<string, number>();
    for (const m of kb.sourceMap) counts.set(m.nodeId, (counts.get(m.nodeId) ?? 0) + 1);
    for (const n of leaves) expect(counts.get(n.id), n.id).toBe(1);
    for (const m of kb.sourceMap) {
      expect(sources.has(m.sourceId), m.sourceId).toBe(true);
      expect(m.chapter.trim(), m.nodeId).not.toBe('');
      expect(m.reason.trim().length, m.nodeId).toBeGreaterThanOrEqual(5);
    }
  });

  it('stores references only: short reasons, no long quoted passages', () => {
    for (const m of kb.sourceMap) {
      expect(m.reason.length, m.nodeId).toBeLessThanOrEqual(200);
      expect(m.chapter.length, m.nodeId).toBeLessThanOrEqual(120);
    }
  });

  it('passes the naming guard on everything a learner can see', () => {
    for (const m of kb.sourceMap) {
      expect(checkText(`${m.reason} ${m.chapter}`), m.nodeId).toEqual([]);
    }
    expect(findHits(kb.sourceMap)).toEqual([]);
    // Sources show their neutral label when set, never an institute title.
    const shown = kb.sources.map((s) => s.neutralLabel ?? `${s.title} ${s.author ?? ''}`);
    expect(findHits(shown)).toEqual([]);
  });

  it('hides the title of any book whose title carries a blocked name behind a neutral label', () => {
    const titled = kb.sources.filter((s) => checkText(`${s.title} ${s.author ?? ''}`).length > 0);
    for (const s of titled) {
      expect(s.neutralLabel, s.id).toBeTruthy();
      expect(checkText(s.neutralLabel ?? ''), s.id).toEqual([]);
    }
    expect(kb.sources.filter((s) => s.neutralLabel).length).toBeGreaterThan(0);
  });
});
