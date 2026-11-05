import { and, count, desc, eq, gt } from 'drizzle-orm';
import type { Db } from '../client';
import { emailCodes } from '../schema';

export type EmailCodeRow = typeof emailCodes.$inferSelect;

export const emailCodesRepo = {
  async insert(
    db: Db,
    row: {
      email: string;
      codeHash: string;
      salt: string;
      expiresAt: Date;
      ip: string | null;
      createdAt?: Date;
    },
  ): Promise<void> {
    await db.insert(emailCodes).values(row);
  },

  async countSince(db: Db, by: { email: string } | { ip: string }, since: Date): Promise<number> {
    const where =
      'email' in by
        ? and(eq(emailCodes.email, by.email), gt(emailCodes.createdAt, since))
        : and(eq(emailCodes.ip, by.ip), gt(emailCodes.createdAt, since));
    const [res] = await db.select({ n: count() }).from(emailCodes).where(where);
    return res?.n ?? 0;
  },

  /** Latest code for the email that has not expired yet. */
  async latestActive(db: Db, email: string, now: Date): Promise<EmailCodeRow | undefined> {
    const [row] = await db
      .select()
      .from(emailCodes)
      .where(and(eq(emailCodes.email, email), gt(emailCodes.expiresAt, now)))
      .orderBy(desc(emailCodes.createdAt))
      .limit(1);
    return row;
  },

  async incrementAttempts(db: Db, id: string, attempts: number): Promise<void> {
    await db.update(emailCodes).set({ attempts }).where(eq(emailCodes.id, id));
  },

  async deleteById(db: Db, id: string): Promise<void> {
    await db.delete(emailCodes).where(eq(emailCodes.id, id));
  },

  async listByEmail(db: Db, email: string): Promise<EmailCodeRow[]> {
    return db.select().from(emailCodes).where(eq(emailCodes.email, email));
  },

  async deleteByEmail(db: Db, email: string): Promise<void> {
    await db.delete(emailCodes).where(eq(emailCodes.email, email));
  },
};
