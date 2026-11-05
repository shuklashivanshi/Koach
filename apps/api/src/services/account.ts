import { aiCallsRepo, emailCodesRepo, usersRepo } from '@koach/db';
import type { ExportBundle } from '@koach/shared';
import type { Deps } from '../deps';

const userPrefix = (uid: string) => `users/${uid}/`;

/** Everything Koach stores about the user (DPDP right to access). */
export async function exportAccount(
  deps: Deps,
  uid: string,
  tokenEmail: string | null,
): Promise<ExportBundle> {
  const user = await usersRepo.upsert(deps.db, uid, tokenEmail);
  const email = user.email;
  const [aiCalls, codes, objects] = await Promise.all([
    aiCallsRepo.listByUid(deps.db, uid),
    email ? emailCodesRepo.listByEmail(deps.db, email) : Promise.resolve([]),
    deps.storage.list(userPrefix(uid)),
  ]);
  return {
    exportedAt: deps.now().toISOString(),
    user: { uid: user.uid, email: user.email, createdAt: user.createdAt.toISOString() },
    // Code hashes are not exported; they are useless to the user and sensitive.
    emailCodes: codes.map((c) => ({
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
    })),
    aiCalls: aiCalls.map((c) => ({
      id: c.id,
      feature: c.feature,
      model: c.model,
      inputTokens: c.inputTokens,
      outputTokens: c.outputTokens,
      chars: c.chars,
      estCostUsd: c.estCostUsd,
      latencyMs: c.latencyMs,
      createdAt: c.createdAt.toISOString(),
    })),
    storageObjects: objects,
  };
}

/**
 * Deletes everything (DPDP right to erasure). Ordered so that a retry after a partial failure
 * still finishes the job; every step is a no-op when there is nothing left to delete.
 */
export async function deleteAccount(
  deps: Deps,
  uid: string,
  tokenEmail: string | null,
): Promise<void> {
  const email = (await usersRepo.get(deps.db, uid))?.email ?? tokenEmail;
  await deps.storage.deletePrefix(userPrefix(uid));
  if (email) await emailCodesRepo.deleteByEmail(deps.db, email);
  await usersRepo.delete(deps.db, uid); // ai_calls cascade
  await deps.identity.deleteUser(uid);
}
