import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { diagnosticAttempts, learnerProfiles, lptResults, subjectLevels } from '../schema';

export type ProfileRow = typeof learnerProfiles.$inferSelect;
export type LptRow = typeof lptResults.$inferSelect;

export const learnerRepo = {
  async getProfile(db: Db, uid: string): Promise<ProfileRow | undefined> {
    const [row] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.uid, uid));
    return row;
  },

  async upsertProfile(
    db: Db,
    uid: string,
    values: Omit<typeof learnerProfiles.$inferInsert, 'uid' | 'updatedAt'>,
  ): Promise<ProfileRow> {
    const [row] = await db
      .insert(learnerProfiles)
      .values({ uid, ...values })
      .onConflictDoUpdate({
        target: learnerProfiles.uid,
        set: { ...values, updatedAt: sql`now()` },
      })
      .returning();
    if (!row) throw new Error('upsert returned no row');
    return row;
  },

  async setLevels(
    db: Db,
    uid: string,
    levels: { sectionId: string; level: number; source: 'self' | 'diagnostic' }[],
  ): Promise<void> {
    if (!levels.length) return;
    await db
      .insert(subjectLevels)
      .values(levels.map((l) => ({ uid, ...l })))
      .onConflictDoUpdate({
        target: [subjectLevels.uid, subjectLevels.sectionId],
        set: { level: sql`excluded.level`, source: sql`excluded.source`, updatedAt: sql`now()` },
      });
  },

  listLevels: (db: Db, uid: string) =>
    db
      .select()
      .from(subjectLevels)
      .where(eq(subjectLevels.uid, uid))
      .orderBy(asc(subjectLevels.sectionId)),

  async addDiagnostic(
    db: Db,
    uid: string,
    answers: { pyqId: string; chosen: string | null; correct: boolean }[],
  ) {
    await db
      .insert(diagnosticAttempts)
      .values({ uid, answers, score: answers.filter((a) => a.correct).length });
  },

  listDiagnostics: (db: Db, uid: string) =>
    db.select().from(diagnosticAttempts).where(eq(diagnosticAttempts.uid, uid)),

  async addLpt(db: Db, values: typeof lptResults.$inferInsert): Promise<LptRow> {
    const [row] = await db.insert(lptResults).values(values).returning();
    if (!row) throw new Error('insert returned no row');
    return row;
  },

  async latestLpt(db: Db, uid: string): Promise<LptRow | undefined> {
    const [row] = await db
      .select()
      .from(lptResults)
      .where(eq(lptResults.uid, uid))
      .orderBy(sql`${lptResults.takenAt} desc`)
      .limit(1);
    return row;
  },

  listLpt: (db: Db, uid: string) =>
    db.select().from(lptResults).where(eq(lptResults.uid, uid)).orderBy(asc(lptResults.takenAt)),

  async updateLpt(db: Db, id: string, values: Partial<typeof lptResults.$inferInsert>) {
    await db
      .update(lptResults)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(lptResults.id, id));
  },
};
