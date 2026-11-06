import { asc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { userNotes } from '../schema';

export type UserNoteRow = typeof userNotes.$inferSelect;

export const userNotesRepo = {
  async add(db: Db, uid: string, title: string, body: string): Promise<UserNoteRow> {
    const [row] = await db.insert(userNotes).values({ uid, title, body }).returning();
    if (!row) throw new Error('insert returned no row');
    return row;
  },

  listByUid(db: Db, uid: string): Promise<UserNoteRow[]> {
    return db
      .select()
      .from(userNotes)
      .where(eq(userNotes.uid, uid))
      .orderBy(asc(userNotes.createdAt));
  },
};
