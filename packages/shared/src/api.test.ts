import { describe, expect, it } from 'vitest';
import { EmailVerifyRequest, MeSchema } from './api';

describe('api contract', () => {
  it('accepts a six-digit code only', () => {
    expect(EmailVerifyRequest.safeParse({ email: 'a@b.co', code: '123456' }).success).toBe(true);
    expect(EmailVerifyRequest.safeParse({ email: 'a@b.co', code: '12345' }).success).toBe(false);
    expect(EmailVerifyRequest.safeParse({ email: 'a@b.co', code: '12345a' }).success).toBe(false);
  });

  it('allows a user without an email', () => {
    const me = { uid: 'u1', email: null, createdAt: new Date().toISOString() };
    expect(MeSchema.parse(me)).toEqual(me);
  });
});
