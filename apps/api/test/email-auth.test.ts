import { emailCodesRepo, schema, usersRepo } from '@koach/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODE_TTL_MS } from '../src/services/email-codes';
import { buildTestApp } from './helpers';

const codeFrom = (text: string) => /(\d{6})/.exec(text)?.[1] ?? '';

describe('email-code sign-in', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  let clock = new Date('2026-11-06T10:00:00Z');
  beforeEach(async () => {
    clock = new Date('2026-11-06T10:00:00Z');
    ctx = await buildTestApp({ now: () => clock });
  });
  afterEach(() => ctx.close());

  const start = (email: string, ip = '10.0.0.1') =>
    ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/email/start',
      payload: { email },
      remoteAddress: ip,
    });
  const verify = (email: string, code: string) =>
    ctx.app.inject({ method: 'POST', url: '/v1/auth/email/verify', payload: { email, code } });

  it('emails a code, stores only its hash, and exchanges it for a custom token', async () => {
    expect((await start('Shivanshi@Example.com')).statusCode).toBe(204);
    const mail = ctx.deps.email.sent[0]!;
    expect(mail.to).toBe('shivanshi@example.com');
    const code = codeFrom(mail.text);
    expect(code).toMatch(/^\d{6}$/);

    const rows = await ctx.deps.db.select().from(schema.emailCodes);
    expect(JSON.stringify(rows)).not.toContain(code);

    const res = await verify('shivanshi@example.com', code);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ customToken: 'custom-token-for-uid-for-shivanshi@example.com' });
    expect(await usersRepo.get(ctx.deps.db, 'uid-for-shivanshi@example.com')).toBeDefined();
    // Burned: the same code cannot be reused.
    expect((await verify('shivanshi@example.com', code)).statusCode).toBe(400);
  });

  it('rejects a wrong code with 400', async () => {
    await start('a@b.co');
    const code = codeFrom(ctx.deps.email.sent[0]!.text);
    const wrong = code === '000000' ? '111111' : '000000';
    const res = await verify('a@b.co', wrong);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_code' });
  });

  it('locks the code after 5 wrong attempts', async () => {
    await start('a@b.co');
    const code = codeFrom(ctx.deps.email.sent[0]!.text);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await verify('a@b.co', wrong)).statusCode).toBe(400);
    expect((await verify('a@b.co', code)).statusCode).toBe(429);
  });

  it('rejects an expired code', async () => {
    await start('a@b.co');
    const code = codeFrom(ctx.deps.email.sent[0]!.text);
    clock = new Date(clock.getTime() + CODE_TTL_MS + 1000);
    expect((await verify('a@b.co', code)).statusCode).toBe(400);
  });

  it('allows 3 starts per 15 minutes per email', async () => {
    for (let i = 0; i < 3; i++) expect((await start('a@b.co', `10.0.0.${i}`)).statusCode).toBe(204);
    expect((await start('a@b.co', '10.0.0.9')).statusCode).toBe(429);
    clock = new Date(clock.getTime() + 16 * 60 * 1000);
    expect((await start('a@b.co', '10.0.0.9')).statusCode).toBe(204);
  });

  it('allows 3 starts per 15 minutes per IP', async () => {
    for (let i = 0; i < 3; i++)
      expect((await start(`u${i}@b.co`, '10.9.9.9')).statusCode).toBe(204);
    expect((await start('u9@b.co', '10.9.9.9')).statusCode).toBe(429);
  });

  it('rejects malformed input with 400', async () => {
    expect((await start('not-an-email')).statusCode).toBe(400);
    expect((await verify('a@b.co', '12ab56')).statusCode).toBe(400);
  });

  it('does not send codes from rate-limited requests', async () => {
    for (let i = 0; i < 4; i++) await start('a@b.co', `10.1.1.${i}`);
    expect(ctx.deps.email.sent).toHaveLength(3);
    expect(await emailCodesRepo.countSince(ctx.deps.db, { email: 'a@b.co' }, new Date(0))).toBe(3);
  });

  it('in dev with echo, a failed send still succeeds; otherwise it errors', async () => {
    const failing = { send: () => Promise.reject(new Error('resend down')) };
    const echo = await buildTestApp({
      email: failing,
      config: { ...ctx.deps.config, EMAIL_DEV_ECHO: '1' },
    });
    const ok = await echo.app.inject({
      method: 'POST',
      url: '/v1/auth/email/start',
      payload: { email: 'smoke@koach.test' },
    });
    expect(ok.statusCode).toBe(204);
    await echo.close();

    const strict = await buildTestApp({ email: failing });
    const bad = await strict.app.inject({
      method: 'POST',
      url: '/v1/auth/email/start',
      payload: { email: 'a@b.co' },
    });
    expect(bad.statusCode).toBe(500);
    await strict.close();
  });
});
