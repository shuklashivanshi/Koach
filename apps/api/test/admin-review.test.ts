import { loadKb, readKb } from '@koach/kb';
import { ReviewSample, ReviewSummary, SourceCatalogue } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;

describe('admin review', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp({
      config: loadConfig({ APP_ENV: 'dev', ADMIN_EMAILS: 'Boss@x.co, other@x.co' }),
    });
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
  });
  afterEach(() => ctx.close());

  const admin = bearer('admin', 'boss@x.co');
  const call = (method: 'GET' | 'POST', url: string, payload?: unknown, headers = admin) =>
    ctx.app.inject({ method, url, headers, ...(payload ? { payload } : {}) });

  it('is closed to signed-in users who are not on the allowlist', async () => {
    const res = await call('GET', '/v1/admin/review/summary', undefined, bearer('u1', 'a@b.co'));
    expect(res.statusCode).toBe(403);
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/v1/admin/review/summary' })).statusCode,
    ).toBe(401);
  });

  it('samples suggested tags and sources with neutral labels', async () => {
    const pyq = ReviewSample.parse(
      (await call('GET', '/v1/admin/review/sample?type=pyq&n=10')).json(),
    );
    expect(pyq.items).toHaveLength(3);
    const src = ReviewSample.parse(
      (await call('GET', '/v1/admin/review/sample?type=source')).json(),
    );
    expect(src.items.map((i) => i.id).sort()).toEqual([
      'gs2.polity.fr.equality',
      'gs2.polity.preamble',
    ]);
    const cat = SourceCatalogue.parse((await call('GET', '/v1/admin/sources')).json());
    expect(cat.sources.find((s) => s.id === 'env-reference')?.label).toBe('Environment reference');
  });

  it('approves and corrects, logs reviews, and reports audit accuracy', async () => {
    expect(
      (await call('POST', '/v1/admin/review/pyq/pre-2023-gs1-q001', { action: 'approve' }))
        .statusCode,
    ).toBe(204);
    const corr = await call('POST', '/v1/admin/review/pyq/pre-2023-gs1-q002', {
      action: 'correct',
      nodes: [{ id: 'gs2.polity.fr.equality', primary: true }],
      questionType: 'statement',
      sourceType: 'partial',
    });
    expect(corr.statusCode).toBe(204);
    const bad = await call('POST', '/v1/admin/review/pyq/pre-2023-gs1-q002', {
      action: 'correct',
      nodes: [{ id: 'nope', primary: true }],
      questionType: 'statement',
      sourceType: 'static',
    });
    expect(bad.json()).toEqual({ error: 'unknown_node' });
    expect(
      (
        await call('POST', '/v1/admin/review/source/gs2.polity.preamble', {
          action: 'correct',
          sourceId: 'laxmikanth-polity',
          chapter: 'Ch 4 · Preamble',
          reason: 'Covers the Preamble clause by clause.',
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (await call('POST', '/v1/admin/review/pyq/missing', { action: 'approve' })).statusCode,
    ).toBe(404);

    const summary = ReviewSummary.parse((await call('GET', '/v1/admin/review/summary')).json());
    expect(summary.pyq).toEqual({ suggested: 1, approved: 1, corrected: 1, accuracy: 0.5 });
    expect(summary.source).toMatchObject({ suggested: 1, corrected: 1, accuracy: 0 });

    // Reviewed items leave the sample, and a reload of the seed keeps the corrections.
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
    const again = ReviewSample.parse(
      (await call('GET', '/v1/admin/review/sample?type=pyq')).json(),
    );
    expect(again.items.map((i) => i.id)).toEqual(['mains-2022-gs2-q001']);
    const node = (
      await ctx.app.inject({
        method: 'GET',
        url: '/v1/kb/nodes/gs2.polity.preamble',
        headers: admin,
      })
    ).json<{
      source: { chapter: string };
    }>();
    expect(node.source.chapter).toBe('Ch 4 · Preamble');
  });
});
