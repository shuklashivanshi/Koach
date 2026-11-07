import { readFile } from 'node:fs/promises';
import { schema } from '@koach/db';
import { createTestDb } from '@koach/db/testing';
import { findHits } from '@koach/guard';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaimsFile, groundStrategyAnswer } from '../src';

const CLAIMS = new URL('../data/strategy/claims.json', import.meta.url).pathname;
const load = async () => ClaimsFile.parse(JSON.parse(await readFile(CLAIMS, 'utf8'))).claims;

describe('strategy KB seed (KB-05)', () => {
  it('holds 80-120 valid claims with kind, source url and date', async () => {
    const claims = await load();
    expect(claims.length).toBeGreaterThanOrEqual(80);
    expect(claims.length).toBeLessThanOrEqual(120);
    expect(new Set(claims.map((c) => c.id)).size).toBe(claims.length);
    for (const c of claims) {
      expect(['topper', 'official']).toContain(c.kind);
      expect(c.topic).toMatch(/^[a-z_]+$/);
      if (c.kind === 'official') expect(c.officialSource, c.id).toBeTruthy();
    }
    expect(claims.some((c) => c.kind === 'topper')).toBe(true);
    expect(claims.some((c) => c.kind === 'official')).toBe(true);
  });

  it('keeps people and sites out of every client-facing field (guard)', async () => {
    const claims = await load();
    const facing = claims.map((c) => [c.topic, c.claim, c.officialSource ?? '']);
    expect(findHits(facing)).toEqual([]);
    // Source sites and their brand words must never appear in what a client can see.
    const brands = new Set(
      claims
        .filter((c) => c.kind === 'topper')
        .flatMap((c) => {
          const host = new URL(c.sourceUrl).hostname.replace(/^(www|news)\./, '');
          return [host, host.split('.')[0]!];
        }),
    );
    for (const c of claims) {
      const text = `${c.claim} ${c.officialSource ?? ''}`.toLowerCase();
      for (const b of brands) expect(text, `${c.id} mentions ${b}`).not.toContain(b);
      expect(text, c.id).not.toMatch(/https?:|www\./);
    }
  });
});

describe('groundStrategyAnswer', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    ctx = await createTestDb();
    const claims = await load();
    await ctx.db.insert(schema.strategyClaims).values(claims);
  });
  afterEach(() => ctx.close());

  const topperRevision = async () =>
    (await load()).filter((c) => c.kind === 'topper' && c.topic === 'revision');

  it('answers from cited claims and exposes only counts and official names', async () => {
    const prompts: string[] = [];
    const rev = (await topperRevision()).slice(0, 2);
    const res = await groundStrategyAnswer(ctx.db, 'how should I plan my revision', async (p) => {
      prompts.push(p);
      return { answer: 'Revise in short, repeated cycles.', usedClaimIds: rev.map((c) => c.id) };
    });
    expect(res.answered).toBe(true);
    expect(res.answer).toBe('Revise in short, repeated cycles.');
    expect(res.basis.topperAccounts).toBeGreaterThan(0);
    expect(res.basis.officialSources).toEqual([]);
    expect(JSON.stringify(res)).not.toMatch(/https?:|thebetterindia|careers360/i);
    // The model never sees source urls, only claim ids and text.
    expect(prompts[0]).not.toMatch(/https?:|thebetterindia|careers360/i);
  });

  it('names an official source rather than a person or site', async () => {
    const off = (await load()).find((c) => c.kind === 'official' && c.topic === 'csat')!;
    const res = await groundStrategyAnswer(
      ctx.db,
      'what is the CSAT qualifying mark',
      async () => ({
        answer: 'CSAT is qualifying only.',
        usedClaimIds: [off.id],
      }),
    );
    expect(res.basis).toEqual({ topperAccounts: 0, officialSources: [off.officialSource] });
  });

  it('declines when nothing matches the question', async () => {
    let called = false;
    const res = await groundStrategyAnswer(ctx.db, 'zebra xylophone quokka', async () => {
      called = true;
      return { answer: 'x', usedClaimIds: [] };
    });
    expect(res).toEqual({
      answered: false,
      answer: null,
      basis: { topperAccounts: 0, officialSources: [] },
    });
    expect(called).toBe(false);
  });

  it('declines when the model cites no real claim or gives an empty answer', async () => {
    const uncited = await groundStrategyAnswer(ctx.db, 'revision plan', async () => ({
      answer: 'Made up advice.',
      usedClaimIds: [],
    }));
    const fake = await groundStrategyAnswer(ctx.db, 'revision plan', async () => ({
      answer: 'Made up advice.',
      usedClaimIds: ['no-such-claim'],
    }));
    const empty = await groundStrategyAnswer(ctx.db, 'revision plan', async () => ({
      answer: '  ',
      usedClaimIds: [(await topperRevision())[0]!.id],
    }));
    for (const r of [uncited, fake, empty]) expect(r.answered).toBe(false);
  });

  it('declines when the model names a blocked person or institute', async () => {
    const res = await groundStrategyAnswer(ctx.db, 'revision plan', async () => ({
      answer: 'As Vision IAS says, revise often.',
      usedClaimIds: [(await topperRevision())[0]!.id],
    }));
    expect(res).toMatchObject({ answered: false, answer: null });
  });
});
