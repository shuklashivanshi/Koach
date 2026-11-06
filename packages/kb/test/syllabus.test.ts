import { describe, expect, it } from 'vitest';
import { readKb, validateKb } from '../src';

const DATA = new URL('../data', import.meta.url).pathname;

// Structural checks on the committed syllabus graph (KB-01).
describe('syllabus graph seed', async () => {
  const kb = await readKb(DATA);
  const gs = kb.syllabus.filter((f) => !f.paper.startsWith('optional:'));
  const optionals = kb.syllabus.filter((f) => f.paper.startsWith('optional:'));
  const leaves = gs.flatMap((f) => f.nodes.filter((n) => n.kind === 'node'));

  it('covers every GS paper with 600–900 study nodes', () => {
    expect(gs.map((f) => f.paper).sort()).toEqual(
      ['csat', 'essay', 'gs1', 'gs2', 'gs3', 'gs4', 'prelims_gs1'].sort(),
    );
    expect(leaves.length).toBeGreaterThanOrEqual(600);
    expect(leaves.length).toBeLessThanOrEqual(900);
  });

  it('gives every study node 30–90 minutes and a stage', () => {
    for (const n of leaves) {
      expect(n.estMinutes, n.id).toBeGreaterThanOrEqual(30);
      expect(n.estMinutes, n.id).toBeLessThanOrEqual(90);
      expect(n.prelims || n.mains, n.id).toBe(true);
    }
  });

  it('has every optional subject at topic level', () => {
    expect(optionals.length).toBeGreaterThanOrEqual(45);
    for (const f of optionals) {
      expect(f.nodes.filter((n) => n.kind === 'topic').length, f.paper).toBeGreaterThan(0);
    }
  });

  it('is structurally valid (ids, parents, acyclic prerequisites, naming rule)', () => {
    expect(validateKb(kb)).toEqual([]);
  });

  it('reaches a paper root from every node', () => {
    const byId = new Map(kb.syllabus.flatMap((f) => f.nodes).map((n) => [n.id, n]));
    for (const n of byId.values()) {
      let cur = n;
      for (let i = 0; cur.parentId && i < 10; i++) cur = byId.get(cur.parentId) ?? cur;
      expect(cur.kind, n.id).toBe('paper');
    }
  });
});
