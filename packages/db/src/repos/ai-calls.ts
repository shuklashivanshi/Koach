import { desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { aiCalls } from '../schema';

export type AiCallRow = typeof aiCalls.$inferSelect;
export type NewAiCall = typeof aiCalls.$inferInsert;

export const aiCallsRepo = {
  async insert(db: Db, row: NewAiCall): Promise<void> {
    await db.insert(aiCalls).values(row);
  },

  async listByUid(db: Db, uid: string): Promise<AiCallRow[]> {
    return db.select().from(aiCalls).where(eq(aiCalls.uid, uid)).orderBy(desc(aiCalls.createdAt));
  },
};
