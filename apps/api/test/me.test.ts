import { usersRepo } from '@koach/db';
import { MeSchema } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { bearer, buildTestApp } from './helpers';

describe('auth + /v1/me (tracer)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp();
  });
  afterEach(() => ctx.close());

  it('serves /health without auth', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, version: 'test' });
  });

  it('rejects /v1/me without a token or with a bad one', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
    const bad = await ctx.app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer nope' },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.json()).toEqual({ error: 'unauthorized' });
  });

  it('creates the user on first call and returns the same row after', async () => {
    const first = await ctx.app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: bearer('u1', 'a@b.co'),
    });
    expect(first.statusCode).toBe(200);
    const me = MeSchema.parse(first.json());
    expect(me).toMatchObject({ uid: 'u1', email: 'a@b.co' });
    expect(await usersRepo.get(ctx.deps.db, 'u1')).toBeDefined();

    const second = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: bearer('u1') });
    expect(MeSchema.parse(second.json())).toEqual(me);
  });
});

describe('config', () => {
  it('refuses dev email echo in prod', () => {
    expect(() =>
      loadConfig({
        APP_ENV: 'prod',
        EMAIL_DEV_ECHO: '1',
        DATABASE_URL: 'x',
        FIREBASE_PROJECT_ID: 'x',
        GCS_BUCKET: 'x',
        RESEND_API_KEY: 'x',
      }),
    ).toThrow(/EMAIL_DEV_ECHO/);
  });

  it('requires production settings in prod', () => {
    expect(() => loadConfig({ APP_ENV: 'prod' })).toThrow(/DATABASE_URL is required/);
  });
});
