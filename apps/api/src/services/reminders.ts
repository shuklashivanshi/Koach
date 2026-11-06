import { type Db, schema } from '@koach/db';
import { checkText } from '@koach/guard';
import { and, eq, lte, sql } from 'drizzle-orm';
import type { PushMessage, PushSender } from './push';
import { caQuizReady } from './ca';
import { istDay, todayPlan } from './study';

// Reminders (NOTIF-01/02): plan ready, due reviews, CA quiz, streak at risk. Rules decide; the
// dispatcher runs every 15 minutes and sends each type at most once a day, never in work or quiet
// hours. Copy: titles ≤ 30 characters, bodies ≤ 60, naming guard applied.

const s = schema;
export const ReminderTypes = ['plan_ready', 'due_reviews', 'ca_quiz', 'streak'] as const;
export type ReminderType = (typeof ReminderTypes)[number];
export type Tone = 'calm' | 'firm' | 'cheerful';

export const DEFAULT_PREFS: Record<ReminderType, { on: boolean; time: string }> = {
  plan_ready: { on: true, time: '07:00' },
  due_reviews: { on: true, time: '19:00' },
  ca_quiz: { on: true, time: '08:30' },
  streak: { on: true, time: '21:00' },
};

const COPY: Record<ReminderType, Record<Tone, (n: number) => { title: string; body: string }>> = {
  plan_ready: {
    calm: (n) => ({
      title: 'Your plan is ready',
      body: `${n} tasks for today, sized to your hours.`,
    }),
    firm: (n) => ({ title: 'Today’s plan', body: `${n} tasks. Start with the first one.` }),
    cheerful: (n) => ({ title: 'A fresh page today', body: `${n} tasks waiting. Let’s begin.` }),
  },
  due_reviews: {
    calm: (n) => ({
      title: 'A few cards are due',
      body: `${n} reviews, about ${Math.ceil(n * 1.5)} minutes.`,
    }),
    firm: (n) => ({ title: 'Reviews due', body: `${n} cards. Clear them before they fade.` }),
    cheerful: (n) => ({ title: 'Quick review?', body: `${n} cards ready. Short and sweet.` }),
  },
  ca_quiz: {
    calm: () => ({ title: 'Today’s questions', body: 'The current affairs quiz is ready.' }),
    firm: () => ({ title: 'Current affairs quiz', body: 'Ten minutes. Do it now.' }),
    cheerful: () => ({ title: 'News, quizzed', body: 'Today’s current affairs quiz is in.' }),
  },
  streak: {
    calm: () => ({
      title: 'Nothing done yet today',
      body: 'One short task keeps the habit going.',
    }),
    firm: () => ({ title: 'Streak at risk', body: 'Do one task before the day ends.' }),
    cheerful: () => ({ title: 'Keep the streak', body: 'One small task and today counts.' }),
  },
};

export function reminderCopy(
  type: ReminderType,
  tone: Tone,
  n: number,
): { title: string; body: string } {
  const c = COPY[type][tone](n);
  if (c.title.length > 30 || c.body.length > 60 || checkText(`${c.title} ${c.body}`).length) {
    throw new Error(`reminder copy out of bounds: ${type}/${tone}`);
  }
  return c;
}

/** Local "HH:MM" in IST. */
const istClock = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(11, 16);
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Is `clock` inside a "HH:MM-HH:MM" range (ranges may cross midnight)? */
export function inRange(range: string | null, clock: string): boolean {
  if (!range) return false;
  const [a, b] = range.split('-');
  if (!a || !b) return false;
  const t = minutes(clock);
  const from = minutes(a);
  const to = minutes(b);
  return from <= to ? t >= from && t < to : t >= from || t < to;
}

/** Within the 15-minute window that starts at `time`. */
const inWindow = (time: string, clock: string) => {
  const d = minutes(clock) - minutes(time);
  return d >= 0 && d < 15;
};

export async function getPrefs(db: Db, uid: string) {
  const [row] = await db.select().from(s.notificationPrefs).where(eq(s.notificationPrefs.uid, uid));
  return { prefs: { ...DEFAULT_PREFS, ...(row?.prefs ?? {}) }, tone: row?.tone ?? 'calm' };
}

export async function dispatchReminders(db: Db, push: PushSender, now: Date) {
  const caReady = await caQuizReady(db, now);
  const day = istDay(now);
  const clock = istClock(now);
  const subs = await db.select().from(s.pushSubscriptions);
  const uids = [...new Set(subs.map((x) => x.uid))];
  let sent = 0;
  for (const uid of uids) {
    const [profile] = await db
      .select()
      .from(s.learnerProfiles)
      .where(eq(s.learnerProfiles.uid, uid));
    if (!profile?.onboardedAt) continue;
    if (inRange(profile.workHours, clock) || inRange(profile.quietHours, clock)) continue;
    const { prefs, tone } = await getPrefs(db, uid);
    for (const type of ReminderTypes) {
      const p = prefs[type];
      if (!p.on || !inWindow(p.time, clock)) continue;
      let n = 0;
      if (type === 'plan_ready') n = (await todayPlan(db, uid, now)).tasks.length;
      if (type === 'due_reviews') {
        const [r] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(s.srsCards)
          .where(and(eq(s.srsCards.uid, uid), lte(s.srsCards.due, now)));
        n = r?.n ?? 0;
      }
      if (type === 'ca_quiz') n = caReady ? 1 : 0;
      if (type === 'streak') {
        const [r] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(s.planTasks)
          .where(
            and(eq(s.planTasks.uid, uid), eq(s.planTasks.day, day), eq(s.planTasks.status, 'done')),
          );
        n = (r?.n ?? 0) === 0 ? 1 : 0;
      }
      if (n <= 0) continue;
      // At most once per type per day.
      const logged = await db
        .insert(s.notificationLog)
        .values({ uid, type, day })
        .onConflictDoNothing()
        .returning();
      if (!logged.length) continue;
      const message: PushMessage = {
        ...reminderCopy(type, tone, n),
        url: type === 'due_reviews' ? '/revise' : type === 'ca_quiz' ? '/ca' : '/today',
      };
      for (const sub of subs.filter((x) => x.uid === uid)) {
        const res = await push.send({ endpoint: sub.endpoint, keys: sub.keys }, message);
        if (res === 'gone')
          await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id));
        else sent++;
      }
    }
  }
  return { sent };
}
