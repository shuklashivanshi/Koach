import { schema } from '@koach/db';
import { createTestDb } from '@koach/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getNode,
  type KbBundle,
  loadKb,
  nodeFrequencies,
  playbooks,
  readKb,
  subjectWeightage,
  validateKb,
} from '../src';

const FIXTURE = new URL('./fixture', import.meta.url).pathname;

describe('knowledge base', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let kb: KbBundle;
  beforeEach(async () => {
    ctx = await createTestDb();
    kb = await readKb(FIXTURE);
  });
  afterEach(() => ctx.close());

  it('reads and validates the seed', () => {
    expect(kb.syllabus[0]?.nodes).toHaveLength(6);
    expect(kb.pyqs).toHaveLength(2);
    expect(validateKb(kb)).toEqual([]);
  });

  it('catches broken references, cycles and blocked names', () => {
    const nodes = kb.syllabus[0]!.nodes;
    const bad: KbBundle = {
      ...kb,
      syllabus: [
        {
          ...kb.syllabus[0]!,
          nodes: [
            ...nodes.map((n) =>
              n.id === 'gs2.polity.preamble' ? { ...n, prereqs: ['gs2.polity.fr.equality'] } : n,
            ),
            { ...nodes[4]!, id: 'gs2.x', title: 'Notes from Vision IAS', prereqs: ['gs2.nope'] },
          ],
        },
      ],
    };
    const errors = validateKb(bad).join('\n');
    expect(errors).toContain('unknown prereq gs2.nope');
    expect(errors).toContain('prereq cycle');
    expect(errors).toContain('blocked name');
  });

  it('loads idempotently and computes frequency + weightage', async () => {
    await loadKb(ctx.db, kb);
    await loadKb(ctx.db, kb);
    const freq = await nodeFrequencies(ctx.db);
    expect(freq.get('gs2.polity.fr.equality')).toEqual({
      prelims: 1,
      mains: 1,
      years: [2023, 2022],
    });
    // Rolled up to ancestors
    expect(freq.get('gs2.polity')).toMatchObject({ prelims: 2, mains: 1 });
    const weights = await subjectWeightage(ctx.db);
    const polity = weights.find((w) => w.sectionId === 'gs2.polity');
    expect(polity).toMatchObject({ prelims: 2, prelimsShare: 1, mains: 1, mainsShare: 1 });
    expect(weights.find((w) => w.sectionId === 'gs2.ir')).toMatchObject({ prelims: 0 });
  });

  it('serves a node with its source (neutral label) and prerequisites', async () => {
    await loadKb(ctx.db, kb);
    const view = await getNode(ctx.db, 'gs2.polity.fr.equality');
    expect(view?.prereqs).toEqual(['gs2.polity.preamble']);
    expect(view?.source).toMatchObject({
      label: 'Indian Polity · M. Laxmikanth',
      chapter: 'Ch 7 · Fundamental Rights',
    });
    expect(await getNode(ctx.db, 'missing')).toBeNull();
  });

  it('never overwrites reviewed tags or source mappings', async () => {
    await loadKb(ctx.db, kb);
    const s = schema;
    await ctx.db
      .update(s.pyqs)
      .set({ tagStatus: 'corrected', sourceType: 'current_affairs' })
      .where(eq(s.pyqs.id, 'pre-2023-gs1-q001'));
    await ctx.db
      .update(s.nodeSources)
      .set({ status: 'approved', chapter: 'Ch 8' })
      .where(eq(s.nodeSources.nodeId, 'gs2.polity.fr.equality'));
    await loadKb(ctx.db, kb);
    const [pyq] = await ctx.db.select().from(s.pyqs).where(eq(s.pyqs.id, 'pre-2023-gs1-q001'));
    expect(pyq?.sourceType).toBe('current_affairs');
    const [ns] = await ctx.db
      .select()
      .from(s.nodeSources)
      .where(eq(s.nodeSources.nodeId, 'gs2.polity.fr.equality'));
    expect(ns?.chapter).toBe('Ch 8');
  });

  it('defines the v1.0 playbooks', () => {
    expect(Object.keys(playbooks).sort()).toEqual(
      ['PB-CA-LINK', 'PB-FOCUS', 'PB-HEAT', 'PB-MISTAKE', 'PB-PYQ', 'PB-SWITCH', 'PB-WHERE'].sort(),
    );
    expect(playbooks['PB-PYQ'].primingPyqs).toEqual({ min: 2, max: 3 });
  });
});
