import { aiCallsRepo, emailCodesRepo, userNotesRepo, usersRepo } from '@koach/db';
import { ExportBundleSchema } from '@koach/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bearer, buildTestApp } from './helpers';

describe('DPDP export and delete', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp();
    await usersRepo.upsert(ctx.deps.db, 'u1', 'a@b.co');
    await aiCallsRepo.insert(ctx.deps.db, {
      uid: 'u1',
      feature: 'ping',
      model: 'm',
      estCostUsd: 0.0001,
    });
    await emailCodesRepo.insert(ctx.deps.db, {
      email: 'a@b.co',
      codeHash: 'h',
      salt: 's',
      expiresAt: new Date(Date.now() + 60_000),
      ip: null,
    });
    await userNotesRepo.add(ctx.deps.db, 'u1', 'Polity class', 'Art 14 notes');
    ctx.deps.storage.objects.add('users/u1/answer-1.jpg');
    ctx.deps.storage.objects.add('users/u2/other.jpg');
  });
  afterEach(() => ctx.close());

  it('exports everything the user owns and nothing else', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/v1/me/export',
      headers: bearer('u1'),
    });
    expect(res.statusCode).toBe(200);
    const bundle = ExportBundleSchema.parse(res.json());
    expect(bundle.user.uid).toBe('u1');
    expect(bundle.aiCalls).toHaveLength(1);
    expect(bundle.emailCodes).toHaveLength(1);
    expect(bundle.notes.map((n) => n.title)).toEqual(['Polity class']);
    expect(bundle.storageObjects).toEqual(['users/u1/answer-1.jpg']);
    expect(JSON.stringify(bundle)).not.toContain('codeHash');
  });

  it('deletes DB rows, stored files and the Firebase user, idempotently', async () => {
    const del = () => ctx.app.inject({ method: 'DELETE', url: '/v1/me', headers: bearer('u1') });
    expect((await del()).statusCode).toBe(204);
    expect(await usersRepo.get(ctx.deps.db, 'u1')).toBeUndefined();
    expect(await aiCallsRepo.listByUid(ctx.deps.db, 'u1')).toHaveLength(0);
    expect(await userNotesRepo.listByUid(ctx.deps.db, 'u1')).toHaveLength(0);
    expect(await emailCodesRepo.listByEmail(ctx.deps.db, 'a@b.co')).toHaveLength(0);
    expect([...ctx.deps.storage.objects]).toEqual(['users/u2/other.jpg']);
    expect(ctx.deps.identity.deleted).toEqual(['u1']);

    expect((await del()).statusCode).toBe(204);
  });

  it('requires auth', async () => {
    expect((await ctx.app.inject({ method: 'DELETE', url: '/v1/me' })).statusCode).toBe(401);
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/me/export' })).statusCode).toBe(401);
  });
});
