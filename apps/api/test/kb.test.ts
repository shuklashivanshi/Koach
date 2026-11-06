import { loadKb, readKb } from '@koach/kb';
import { KbNodeDetail, KbNodeList, KbPyqList, KbStats } from '@koach/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { bearer, buildTestApp } from './helpers';

const FIXTURE = new URL('../../../packages/kb/test/fixture', import.meta.url).pathname;

describe('knowledge base API', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp();
    await loadKb(ctx.deps.db, await readKb(FIXTURE));
  });
  afterEach(() => ctx.close());

  const get = (url: string) =>
    ctx.app.inject({ method: 'GET', url, headers: bearer('u1', 'a@b.co') });

  it('requires sign-in', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/kb/stats' })).statusCode).toBe(401);
  });

  it('lists nodes by paper and serves a node with source and frequency', async () => {
    const list = await get('/v1/kb/nodes?paper=gs2');
    expect(KbNodeList.parse(list.json()).nodes).toHaveLength(6);
    const res = await get('/v1/kb/nodes/gs2.polity.fr.equality');
    expect(res.statusCode).toBe(200);
    const detail = KbNodeDetail.parse(res.json());
    expect(detail.frequency).toEqual({ prelims: 1, mains: 1, years: [2023, 2022] });
    expect(detail.source?.label).toBe('Indian Polity · M. Laxmikanth');
    expect(JSON.stringify(res.json())).not.toContain('status');
    expect((await get('/v1/kb/nodes/nope')).statusCode).toBe(404);
  });

  it('serves subject weightage and PYQs for a node', async () => {
    const stats = KbStats.parse((await get('/v1/kb/stats')).json());
    expect(stats.subjects.find((s) => s.sectionId === 'gs2.polity')?.prelimsShare).toBe(1);
    const { pyqs } = KbPyqList.parse((await get('/v1/kb/pyqs?node=gs2.polity.fr.equality')).json());
    expect(pyqs.map((p) => p.id)).toEqual(['mains-2022-gs2-q001', 'pre-2023-gs1-q001']);
  });
});

describe('naming guard on responses', () => {
  const leaky = (app: FastifyInstance) => {
    app.get('/leak', () => ({ tip: 'Use Vision IAS notes' }));
    return Promise.resolve();
  };

  it('fails the response outside prod', async () => {
    const ctx = await buildTestApp({}, { protectedRoutes: [() => leaky as never] });
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/v1/leak',
      headers: bearer('u1', 'a@b.co'),
    });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('Vision');
    await ctx.close();
  });

  it('redacts in prod', async () => {
    const config = loadConfig({
      APP_ENV: 'prod',
      DATABASE_URL: 'x',
      FIREBASE_PROJECT_ID: 'x',
      GCS_BUCKET: 'x',
      RESEND_API_KEY: 'x',
    });
    const ctx = await buildTestApp({ config }, { protectedRoutes: [() => leaky as never] });
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/v1/leak',
      headers: bearer('u1', 'a@b.co'),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tip: 'Use [source] notes' });
    await ctx.close();
  });
});
