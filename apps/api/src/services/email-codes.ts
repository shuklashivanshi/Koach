import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { emailCodesRepo, usersRepo } from '@koach/db';
import type { FastifyBaseLogger } from 'fastify';
import type { Deps } from '../deps';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const START_LIMIT = 3;
export const START_WINDOW_MS = 15 * 60 * 1000;

const normalise = (email: string) => email.trim().toLowerCase();
const hashCode = (salt: string, code: string) =>
  createHash('sha256').update(salt).update(code).digest('hex');

/** Creates and emails a 6-digit code. Only a salted hash is stored (D-04). */
export async function startEmailSignIn(
  deps: Deps,
  rawEmail: string,
  ip: string,
  log: FastifyBaseLogger,
): Promise<'sent' | 'rate_limited'> {
  const email = normalise(rawEmail);
  const now = deps.now();
  const since = new Date(now.getTime() - START_WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    emailCodesRepo.countSince(deps.db, { email }, since),
    emailCodesRepo.countSince(deps.db, { ip }, since),
  ]);
  if (byEmail >= START_LIMIT || byIp >= START_LIMIT) return 'rate_limited';

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const salt = randomBytes(16).toString('hex');
  await emailCodesRepo.insert(deps.db, {
    email,
    codeHash: hashCode(salt, code),
    salt,
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    ip,
    createdAt: now,
  });
  await deps.email.send({
    to: email,
    subject: 'Your Koach code',
    text: `Your Koach code is ${code}. It expires in 10 minutes.`,
  });
  if (deps.config.APP_ENV === 'dev' && deps.config.EMAIL_DEV_ECHO === '1') {
    log.info({ email, code }, 'dev_email_code');
  }
  return 'sent';
}

export type VerifyResult =
  { kind: 'ok'; customToken: string } | { kind: 'invalid' } | { kind: 'too_many_attempts' };

/** Checks a code; on success burns it and returns a Firebase custom token. */
export async function verifyEmailSignIn(
  deps: Deps,
  rawEmail: string,
  code: string,
): Promise<VerifyResult> {
  const email = normalise(rawEmail);
  const row = await emailCodesRepo.latestActive(deps.db, email, deps.now());
  if (!row) return { kind: 'invalid' };

  const attempts = row.attempts + 1;
  if (attempts > MAX_ATTEMPTS) return { kind: 'too_many_attempts' };
  await emailCodesRepo.incrementAttempts(deps.db, row.id, attempts);

  const expected = Buffer.from(row.codeHash, 'hex');
  const actual = Buffer.from(hashCode(row.salt, code), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { kind: 'invalid' };
  }

  await emailCodesRepo.deleteById(deps.db, row.id);
  // Same uid as a Google sign-in with this email, so both methods reach one account.
  const uid = await deps.identity.resolveUidForEmail(email);
  await usersRepo.upsert(deps.db, uid, email);
  return { kind: 'ok', customToken: await deps.identity.createCustomToken(uid) };
}
