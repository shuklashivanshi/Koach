import { type Db, schema } from '@koach/db';
import { checkText } from '@koach/guard';
import {
  type OptionalProfile,
  pooledSuccess,
  type QuizAnswers,
  rankOptionals,
  type SuccessStats,
} from '@koach/kb';
import { OPTIONAL_UNIT_MINUTES, phaseFor } from '@koach/planner';
import { and, asc, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import type { AiService } from './ai';
import { istDay } from './time';

// Optional Discovery (OPT-01..05): official numbers, transparent fit, a grounded coach.

const s = schema;

export async function allOptionals(db: Db) {
  const rows = await db.select().from(s.optionalInfo);
  return rows.map((r) => ({
    slug: r.slug,
    profile: r.profile as unknown as OptionalProfile,
    stats: pooledSuccess(r.stats),
    years: r.stats,
  }));
}

export async function explorer(db: Db, slug: string) {
  const [row] = await db.select().from(s.optionalInfo).where(eq(s.optionalInfo.slug, slug));
  if (!row) return null;
  const p = row.profile as unknown as OptionalProfile;
  const topics = await db
    .select({
      id: s.syllabusNodes.id,
      title: s.syllabusNodes.title,
      parentId: s.syllabusNodes.parentId,
    })
    .from(s.syllabusNodes)
    .where(eq(s.syllabusNodes.paper, `optional:${slug}`))
    .orderBy(asc(s.syllabusNodes.ord));
  const sections = p.overlapSections.length
    ? await db
        .select({ id: s.syllabusNodes.id, title: s.syllabusNodes.title })
        .from(s.syllabusNodes)
        .where(inArray(s.syllabusNodes.id, p.overlapSections))
    : [];
  return {
    slug,
    name: p.name,
    summary: p.summary,
    hours: p.hours,
    topics: topics.filter((t) => /\.p\d$/.test(t.parentId ?? '')).map((t) => t.title),
    gsOverlap: p.gsOverlap,
    overlapsWith: sections.map((x) => x.title),
    books: p.books,
    materials: p.materials,
    answerStyle: p.answer,
    success: pooledSuccess(row.stats),
    years: row.stats.map((y) => ({
      examYear: y.examYear,
      appeared: y.appeared,
      recommended: y.recommended,
    })),
    sources: [...new Set(row.stats.map((y) => y.source))],
  };
}

export async function runQuiz(db: Db, uid: string, answers: QuizAnswers) {
  const all = await allOptionals(db);
  const profiles = Object.fromEntries(all.map((o) => [o.slug, o.profile]));
  const stats: Record<string, SuccessStats> = Object.fromEntries(all.map((o) => [o.slug, o.stats]));
  const ranking = rankOptionals(profiles, answers, stats);
  await db
    .update(s.learnerProfiles)
    .set({ optionalQuiz: answers as unknown as Record<string, unknown> })
    .where(eq(s.learnerProfiles.uid, uid));
  return ranking;
}

export async function decisionStatus(db: Db, uid: string, now: Date) {
  const [p] = await db.select().from(s.learnerProfiles).where(eq(s.learnerProfiles.uid, uid));
  if (!p) return null;
  const today = istDay(now);
  const daysLeft = Math.ceil(
    (new Date(`${p.optionalDeadline}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  return {
    deadline: p.optionalDeadline,
    daysLeft,
    chosen: p.optional,
    reasons: p.optionalReasons,
    quizTaken: !!p.optionalQuiz,
  };
}

const CoachAnswer = z.object({ answer: z.string(), stressTest: z.string().nullable() });

/** OPT-03: answers only from the explorer facts and the learner's own quiz answers. */
export async function optionalCoach(
  db: Db,
  ai: AiService,
  uid: string,
  question: string,
  slugs: string[],
  now: Date,
) {
  const status = await decisionStatus(db, uid, now);
  const facts = (await Promise.all(slugs.slice(0, 3).map((sl) => explorer(db, sl)))).filter(
    (x) => !!x,
  );
  const [p] = await db.select().from(s.learnerProfiles).where(eq(s.learnerProfiles.uid, uid));
  const evidence = facts
    .map(
      (f) =>
        `${f.name}: ~${f.hours} hours first pass; ${f.topics.length} syllabus units; GS/Essay overlap ${Math.round(f.gsOverlap * 100)}% (${f.overlapsWith.slice(0, 5).join(', ')}); official success ${
          f.success.rate === null
            ? 'no data'
            : `${(f.success.rate * 100).toFixed(1)}% (95% band ${(f.success.low! * 100).toFixed(1)}–${(f.success.high! * 100).toFixed(1)}%, ${f.success.appeared} appeared over ${f.success.years} years${f.success.smallSample ? ', small sample' : ''})`
        }; sample units: ${f.topics.slice(0, 6).join('; ')}`,
    )
    .join('\n');
  const res = await ai.json({
    feature: 'optional.coach',
    tier: 'bulk',
    uid,
    schema: CoachAnswer,
    prompt: `You are a calm, honest coach helping a UPSC aspirant choose their Mains optional.
Use ONLY the evidence below and the aspirant's own answers. If the evidence does not cover the
question, say so plainly. Correct myths ("scoring optional", "everyone takes X") with the official
numbers and their uncertainty. Keep it to 3–5 sentences. If useful, add one stress test (an hours
check, a 3-line answer to a real syllabus unit, or a regret question) in stressTest, else null.
End by noting the decision deadline${status ? ` (${status.deadline}, ${status.daysLeft} days left)` : ''}.
Never name any person, coaching institute, app, website or channel.

Aspirant's quiz answers: ${JSON.stringify(p?.optionalQuiz ?? {})}
Evidence:
${evidence || 'No optional selected yet.'}

Question: ${question}`,
  });
  const clean = (t: string | null) => (t && !checkText(t).length ? t : null);
  return {
    answer: clean(res.data.answer) ?? 'I can’t answer that from the evidence I have.',
    stressTest: clean(res.data.stressTest),
  };
}

export async function recordChoice(db: Db, uid: string, slug: string, reasons: string, now: Date) {
  const [row] = await db
    .select({ slug: s.optionalInfo.slug })
    .from(s.optionalInfo)
    .where(eq(s.optionalInfo.slug, slug));
  if (!row) return false;
  await db
    .update(s.learnerProfiles)
    .set({ optional: slug, optionalReasons: reasons, optionalDecidedAt: now })
    .where(eq(s.learnerProfiles.uid, uid));
  return true;
}

/** Plan day after `day` (both YYYY-MM-DD, IST calendar days). */
const nextDay = (day: string) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);

const phaseOnDay = (day: string) => phaseFor(new Date(`${day}T06:00:00+05:30`));

/**
 * When the chosen optional joins the plan: today if today's plan has not been built yet (plans
 * are stable once generated), otherwise tomorrow. Paused when that day is in the Prelims phase.
 */
export async function choiceResult(db: Db, uid: string, now: Date) {
  const status = await decisionStatus(db, uid, now);
  if (!status) return null;
  const today = istDay(now);
  const [existing] = await db
    .select({ id: s.planTasks.id })
    .from(s.planTasks)
    .where(and(eq(s.planTasks.uid, uid), eq(s.planTasks.day, today)))
    .limit(1);
  const startsOn = existing ? nextDay(today) : today;
  return { ...status, startsOn, pausedForPrelims: phaseOnDay(startsOn) === 'prelims' };
}

/** OPT-04: the chosen optional's units in syllabus order with studied and planned state. */
export async function optionalOutline(db: Db, uid: string, now: Date) {
  const [p] = await db.select().from(s.learnerProfiles).where(eq(s.learnerProfiles.uid, uid));
  if (!p?.optional) return null;
  const [info] = await db.select().from(s.optionalInfo).where(eq(s.optionalInfo.slug, p.optional));
  if (!info) return null;
  const profile = info.profile as unknown as OptionalProfile;
  const topics = await db
    .select()
    .from(s.syllabusNodes)
    .where(
      and(eq(s.syllabusNodes.paper, `optional:${p.optional}`), eq(s.syllabusNodes.kind, 'topic')),
    )
    .orderBy(asc(s.syllabusNodes.ord));
  const ids = topics.map((t) => t.id);
  const [mastery, planned] = ids.length
    ? await Promise.all([
        db
          .select({ nodeId: s.nodeMastery.nodeId })
          .from(s.nodeMastery)
          .where(
            and(
              eq(s.nodeMastery.uid, uid),
              inArray(s.nodeMastery.nodeId, ids),
              isNotNull(s.nodeMastery.studiedAt),
            ),
          ),
        db
          .select({ nodeId: s.planTasks.nodeId, day: s.planTasks.day })
          .from(s.planTasks)
          .where(
            and(
              eq(s.planTasks.uid, uid),
              eq(s.planTasks.status, 'todo'),
              inArray(s.planTasks.nodeId, ids),
              gte(s.planTasks.day, istDay(now)),
            ),
          )
          .orderBy(asc(s.planTasks.day)),
      ])
    : [[], []];
  const studied = new Set(mastery.map((m) => m.nodeId));
  const scheduled = new Map<string, string>();
  for (const r of planned) if (r.nodeId && !scheduled.has(r.nodeId)) scheduled.set(r.nodeId, r.day);
  const units = topics.map((t) => ({
    nodeId: t.id,
    title: t.title,
    paper: /\.p1$/.test(t.parentId ?? '')
      ? ('I' as const)
      : /\.p2$/.test(t.parentId ?? '')
        ? ('II' as const)
        : null,
    minutes: OPTIONAL_UNIT_MINUTES,
    status: studied.has(t.id) ? ('studied' as const) : ('todo' as const),
    scheduledOn: studied.has(t.id) ? null : (scheduled.get(t.id) ?? null),
  }));
  return {
    slug: p.optional,
    name: profile.name,
    firstPassHours: profile.hours,
    plannedHours: (units.length * OPTIONAL_UNIT_MINUTES) / 60,
    studied: studied.size,
    paused: phaseFor(now) === 'prelims',
    units,
  };
}
