import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { users } from '../schema';

export type UserRow = typeof users.$inferSelect;

export const usersRepo = {
  /** Creates the user on first sight; fills in an email if one becomes known later. */
  async upsert(db: Db, uid: string, email: string | null): Promise<UserRow> {
    const [row] = await db
      .insert(users)
      .values({ uid, email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: email ?? users.email },
      })
      .returning();
    if (!row) throw new Error('upsert returned no row');
    return row;
  },

  async get(db: Db, uid: string): Promise<UserRow | undefined> {
    const [row] = await db.select().from(users).where(eq(users.uid, uid));
    return row;
  },

  async delete(db: Db, uid: string): Promise<void> {
    await db.delete(users).where(eq(users.uid, uid));
  },
};
