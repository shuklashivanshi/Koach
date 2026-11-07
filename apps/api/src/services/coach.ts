import { type Db, schema } from '@koach/db';
import { checkText } from '@koach/guard';
import { FIRST_PASS_DEADLINE } from '@koach/planner';
import { and, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AiService } from './ai';
import type { PushSender } from './push';
import { inRange, type Tone } from './reminders';
import { optionalDeadline } from './optionals';
import { istDay } from './time';

// Coaching (NUDGE-01..03). Rules decide when; Gemini only writes the words, with a template
// fallback so a nudge never depends on an AI call succeeding.

const s = schema;
const DAY = 86_400_000;
const MAX_PER_DAY = 3;
const MIN_GAP_MS = 3 * 3_600_000;

export type NudgeKind = 'slipping' | 'deadline' | 'idle' | 'decision';

/** Monday (IST) of the week containing `d`, as YYYY-MM-DD. */
export function weekOf(d: Date): string {
  const day = istDay(d);
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return istDay(new Date(new Date(`${day}T00:00:00Z`).getTime() - dow * DAY + 6 * 3_600_000));
}

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** Decision copy by days left (the nudge subject): before, on and after the deadline. */
function decisionLeft(
  subject: string,
  v: {
    soon: (days: string) => { title: string; body: string };
    today: { title: string; body: string };
    over: (days: string) => { title: string; body: string };
  },
) {
  const n = Number(subject);
  return n < 0 ? v.over(plural(-n)) : n === 0 ? v.today : v.soon(plural(n));
}

export const TEMPLATES: Record<
  NudgeKind,
  Record<Tone, (x: string) => { title: string; body: string }>
> = {
  slipping: {
    calm: (x) => ({ title: `${x} is waiting`, body: `A short ${x} review today keeps it fresh.` }),
    firm: (x) => ({ title: `${x} is slipping`, body: `Revise ${x} today before it fades.` }),
    cheerful: (x) => ({
      title: `Remember ${x}?`,
      body: `Ten minutes of ${x} brings it right back.`,
    }),
  },
  deadline: {
    calm: () => ({
      title: 'First pass by 15 Feb',
      body: 'A little extra Learn time this week helps.',
    }),
    firm: () => ({ title: 'Behind the first pass', body: 'Add one Learn task a day this week.' }),
    cheerful: () => ({
      title: 'Coverage check',
      body: 'One more topic a day and you’re on track.',
    }),
  },
  decision: {
    calm: (x) =>
      decisionLeft(x, {
        soon: (d) => ({ title: 'Your optional', body: `${d} to decide. The coach can help.` }),
        today: { title: 'Your optional', body: 'Today is the day to decide. Ask the coach.' },
        over: (d) => ({ title: 'Your optional', body: `The date passed ${d} ago. Ask the coach.` }),
      }),
    firm: (x) =>
      decisionLeft(x, {
        soon: (d) => ({
          title: 'Choose your optional',
          body: `${d} left. Compare your top two today.`,
        }),
        today: { title: 'Choose your optional', body: 'Last day to choose. Compare your top two.' },
        over: (d) => ({
          title: 'Choose your optional',
          body: `The date passed ${d} ago. Choose one today.`,
        }),
      }),
    cheerful: (x) =>
      decisionLeft(x, {
        soon: (d) => ({ title: 'Optional check-in', body: `${d} to go. Let’s narrow it down.` }),
        today: { title: 'Optional check-in', body: 'Decision day is here. Let’s narrow it down.' },
        over: (d) => ({
          title: 'Optional check-in',
          body: `The date passed ${d} ago. Let’s pick one.`,
        }),
      }),
  },
  idle: {
    calm: () => ({ title: 'Your desk is ready', body: 'One short task is a good restart.' }),
    firm: () => ({ title: 'Two days away', body: 'Open today’s plan and do the first task.' }),
    cheerful: () => ({ title: 'Welcome back soon', body: 'Today’s plan is small and ready.' }),
  },
};

const Copy = z.object({ title: z.string(), body: z.string() });

async function nudgeCopy(ai: AiService | null, kind: NudgeKind, tone: Tone, subject: string) {
  const fallback = TEMPLATES[kind][tone](subject);
  if (!ai) return fallback;
  try {
    const res = await ai.json({
      feature: `nudge.${kind}`,
      tier: 'lite',
      uid: '',
      schema: Copy,
      prompt: `Write a push notification for a UPSC aspirant. Situation: ${
        kind === 'slipping'
          ? `they have not revised ${subject} for over a week`
          : kind === 'deadline'
            ? 'their first pass of the syllabus is behind schedule for 15 February'
            : kind === 'decision'
              ? Number(subject) < 0
                ? `the date to choose their Mains optional subject passed ${-Number(subject)} days ago and they have not chosen yet`
                : Number(subject) === 0
                  ? 'today is the last day to choose their Mains optional subject'
                  : `they must choose their Mains optional subject within ${subject} days`
              : 'they have not opened their plan for two days'
      }. Tone: ${tone}. Title ≤ 30 characters, body ≤ 60 characters. Kind, specific, no emoji, no
exclamation marks, no names of people, institutes, apps or websites.`,
    });
    const { title, body } = res.data;
    if (title.length <= 30 && body.length <= 60 && !checkText(`${title} ${body}`).length)
      return { title, body };
  } catch {
    // fall through to the template
  }
  return fallback;
}

/** NUDGE-01 triggers, most important first. */
export async function nudgeCandidates(
  db: Db,
  uid: string,
  now: Date,
): Promise<{ kind: NudgeKind; subject: string }[]> {
  const out: { kind: NudgeKind; subject: string }[] = [];
  // D-05: nudge toward the optional decision from 14 days out, and keep going past the
  // deadline (negative subject) until a choice is made.
  const [p] = await db.select().from(s.learnerProfiles).where(eq(s.learnerProfiles.uid, uid));
  if (p && !p.optional) {
    const { daysLeft } = optionalDeadline(p.optionalDeadline, now);
    if (daysLeft <= 14) out.push({ kind: 'decision', subject: String(daysLeft) });
  }
  const lastDone = await db
    .select({ at: sql<Date>`max(${s.planTasks.doneAt})` })
    .from(s.planTasks)
    .where(eq(s.planTasks.uid, uid));
  const last = lastDone[0]?.at ? new Date(lastDone[0].at) : null;
  if (last && now.getTime() - last.getTime() > 2 * DAY) out.push({ kind: 'idle', subject: '' });

  // A studied section with nothing touched for 7+ days.
  const stale = await db
    .select({ nodeId: s.nodeMastery.nodeId, updatedAt: s.nodeMastery.updatedAt })
    .from(s.nodeMastery)
    .where(
      and(
        eq(s.nodeMastery.uid, uid),
        isNotNull(s.nodeMastery.studiedAt),
        lt(s.nodeMastery.updatedAt, new Date(now.getTime() - 7 * DAY)),
      ),
    )
    .limit(1);
  if (stale[0]) {
    const [node] = await db
      .select({ title: s.syllabusNodes.title })
      .from(s.syllabusNodes)
      .where(eq(s.syllabusNodes.id, stale[0].nodeId));
    const short = (node?.title ?? 'a topic')
      .split(/[:(–-]/)[0]!
      .trim()
      .slice(0, 18);
    out.push({ kind: 'slipping', subject: short });
  }

  // First-pass pace: studied share vs a straight line from first study to 15 Feb.
  const [{ studied = 0, first = null } = {}] = await db
    .select({
      studied: sql<number>`count(*)::int`,
      first: sql<Date | null>`min(${s.nodeMastery.studiedAt})`,
    })
    .from(s.nodeMastery)
    .where(and(eq(s.nodeMastery.uid, uid), isNotNull(s.nodeMastery.studiedAt)));
  if (first) {
    const [{ total = 1 } = {}] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(s.syllabusNodes)
      .where(and(eq(s.syllabusNodes.kind, 'node'), eq(s.syllabusNodes.prelims, true)));
    const span = FIRST_PASS_DEADLINE.getTime() - new Date(first).getTime();
    const target = span > 0 ? Math.min(1, (now.getTime() - new Date(first).getTime()) / span) : 1;
    if (
      studied / Math.max(1, total) < target * 0.8 &&
      now.getTime() - new Date(first).getTime() > 7 * DAY
    ) {
      out.push({ kind: 'deadline', subject: '' });
    }
  }
  return out;
}

export async function dispatchNudges(
  db: Db,
  push: PushSender,
  ai: AiService | null,
  now: Date,
  uid: string,
  profile: { workHours: string | null; quietHours: string | null },
  tone: Tone,
  clock: string,
  targets: { endpoint: string; keys: { p256dh: string; auth: string } }[],
) {
  if (inRange(profile.workHours, clock) || inRange(profile.quietHours, clock)) return 0;
  const day = istDay(now);
  const today = await db
    .select()
    .from(s.nudgeLog)
    .where(and(eq(s.nudgeLog.uid, uid), eq(s.nudgeLog.day, day)))
    .orderBy(desc(s.nudgeLog.sentAt));
  if (today.length >= MAX_PER_DAY) return 0;
  if (today[0] && now.getTime() - today[0].sentAt.getTime() < MIN_GAP_MS) return 0;
  const sentKinds = new Set(today.map((n) => n.kind));
  const next = (await nudgeCandidates(db, uid, now)).find((c) => !sentKinds.has(c.kind));
  if (!next) return 0;
  const copy = await nudgeCopy(ai, next.kind, tone, next.subject);
  await db
    .insert(s.nudgeLog)
    .values({ uid, day, kind: next.kind, text: `${copy.title} · ${copy.body}`, sentAt: now });
  for (const t of targets) await push.send(t, { ...copy, url: '/today' });
  return 1;
}

// --- Sunday coach note (NUDGE-02) and well-being check-in (NUDGE-03) ---------------------------

const Note = z.object({ kept: z.string(), slipped: z.string(), change: z.string() });

export async function writeCoachNote(db: Db, ai: AiService | null, uid: string, now: Date) {
  const week = weekOf(now);
  const [existing] = await db
    .select()
    .from(s.coachNotes)
    .where(and(eq(s.coachNotes.uid, uid), eq(s.coachNotes.week, week)));
  if (existing) return existing;
  const since = `${week}`;
  const rows = await db
    .select({ kind: s.planTasks.kind, status: s.planTasks.status, title: s.planTasks.title })
    .from(s.planTasks)
    .where(and(eq(s.planTasks.uid, uid), gte(s.planTasks.day, since)));
  const done = rows.filter((r) => r.status === 'done');
  const missed = rows.filter((r) => r.status !== 'done');
  const stats = `Done ${done.length} of ${rows.length} tasks (${done.filter((d) => d.kind === 'learn').length} learn, ${done.filter((d) => d.kind === 'revise').length} revise). Missed: ${
    missed
      .slice(0, 3)
      .map((m) => m.title)
      .join('; ') || 'none'
  }.`;
  let lines = [
    `Kept: ${done.length} of ${rows.length} tasks done.`,
    `Slipped: ${missed.length ? missed[0]!.title : 'nothing major'}.`,
    'One change: start each day with the first task on Today.',
  ];
  if (ai) {
    try {
      const res = await ai.json({
        feature: 'coach.note',
        tier: 'lite',
        uid: '',
        schema: Note,
        prompt: `Write a calm weekly note for a UPSC aspirant in three short lines (≤ 90 characters each):
kept (what went well), slipped (what slipped), change (one concrete change for next week).
Facts: ${stats} No names of people, institutes, apps or websites. No exclamation marks.`,
      });
      const l = [
        `Kept: ${res.data.kept}`,
        `Slipped: ${res.data.slipped}`,
        `One change: ${res.data.change}`,
      ];
      if (!checkText(l.join(' ')).length && l.every((x) => x.length <= 110)) lines = l;
    } catch {
      // template lines stay
    }
  }
  const [row] = await db
    .insert(s.coachNotes)
    .values({ uid, week, lines })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

/** Load multiplier for planning: a "heavy" check-in this week (or last) lightens the next 7 days. */
export async function loadFactor(db: Db, uid: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - 8 * DAY);
  const [last] = await db
    .select()
    .from(s.wellbeing)
    .where(and(eq(s.wellbeing.uid, uid), gte(s.wellbeing.createdAt, since)))
    .orderBy(desc(s.wellbeing.createdAt))
    .limit(1);
  return last?.level === 'heavy' ? 0.8 : 1;
}
