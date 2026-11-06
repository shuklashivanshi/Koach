import { type Db, schema } from '@koach/db';
import { nodeFrequencies, subjectOfSection, subjectWeightage } from '@koach/kb';
import {
  buildDay,
  displayedMastery,
  fromJson,
  grade,
  GRADE_SCORE,
  type NodeCandidate,
  newCard,
  nodePriority,
  type PlanTask,
  phaseFor,
  rebalance,
  replan,
  retrievability,
  type SrsGrade,
  toJson,
  updateMastery,
} from '@koach/planner';
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm';

// The daily loop (Phase 4) on top of the KB and the planner engine.

const s = schema;
const INITIAL_MASTERY = 0.1;

/** Calendar day in IST as YYYY-MM-DD. */
export const istDay = (d: Date) =>
  new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Study nodes with their section, subject, prerequisites, source and PYQ counts. */
async function kbNodes(db: Db) {
  const nodes = await db.select().from(s.syllabusNodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sectionOf = (id: string) => {
    let cur = byId.get(id);
    while (cur && cur.kind !== 'section') cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    return cur?.id;
  };
  const [prereqs, sources, freq, weights] = await Promise.all([
    db.select().from(s.nodePrereqs),
    db
      .select({
        nodeId: s.nodeSources.nodeId,
        chapter: s.nodeSources.chapter,
        title: s.sources.title,
        author: s.sources.author,
        neutral: s.sources.neutralLabel,
      })
      .from(s.nodeSources)
      .innerJoin(s.sources, eq(s.sources.id, s.nodeSources.sourceId)),
    nodeFrequencies(db),
    subjectWeightage(db),
  ]);
  const pre = new Map<string, string[]>();
  for (const p of prereqs) pre.set(p.nodeId, [...(pre.get(p.nodeId) ?? []), p.prereqId]);
  const src = new Map(
    sources.map((r) => [
      r.nodeId,
      { label: r.neutral ?? (r.author ? `${r.title} · ${r.author}` : r.title), chapter: r.chapter },
    ]),
  );
  const share = new Map(weights.map((w) => [w.sectionId, Math.max(w.prelimsShare, w.mainsShare)]));
  const maxFreq = { prelims: 1, mains: 1 };
  for (const f of freq.values()) {
    maxFreq.prelims = Math.max(maxFreq.prelims, f.prelims);
    maxFreq.mains = Math.max(maxFreq.mains, f.mains);
  }
  return nodes
    .filter((n) => n.kind === 'node' && !n.paper.startsWith('optional:'))
    .map((n) => {
      const section = sectionOf(n.id) ?? '';
      return {
        id: n.id,
        title: n.title,
        section,
        subject: subjectOfSection.get(section) ?? section,
        estMinutes: n.estMinutes ?? 60,
        prelims: n.prelims,
        mains: n.mains,
        prereqs: pre.get(n.id) ?? [],
        source: src.get(n.id) ?? null,
        freq: freq.get(n.id) ?? { prelims: 0, mains: 0, years: [] },
        sectionShare: share.get(section) ?? 0,
        maxFreq,
      };
    });
}

type TaskRow = typeof s.planTasks.$inferSelect;
const toPlanTask = (t: TaskRow): PlanTask => ({
  kind: t.kind,
  nodeId: t.nodeId,
  title: t.title,
  minutes: t.minutes,
  goal: t.goal,
  reason: t.reason,
  source: t.source,
  priority: t.priority,
});

async function insertTasks(db: Db, uid: string, day: string, tasks: PlanTask[]) {
  if (!tasks.length) return;
  await db.insert(s.planTasks).values(tasks.map((t, position) => ({ uid, day, position, ...t })));
}

/** Learner state the planner needs: candidates with mastery, and due reviews grouped by node. */
async function plannerInputs(db: Db, uid: string, now: Date) {
  const phase = phaseFor(now);
  const [nodes, mastery, levels, due] = await Promise.all([
    kbNodes(db),
    db.select().from(s.nodeMastery).where(eq(s.nodeMastery.uid, uid)),
    db.select().from(s.subjectLevels).where(eq(s.subjectLevels.uid, uid)),
    db
      .select({ nodeId: s.srsCards.nodeId, n: sql<number>`count(*)::int` })
      .from(s.srsCards)
      .where(and(eq(s.srsCards.uid, uid), lte(s.srsCards.due, now)))
      .groupBy(s.srsCards.nodeId),
  ]);
  const m = new Map(mastery.map((r) => [r.nodeId, r]));
  const level = new Map(levels.map((l) => [l.sectionId, l.level]));
  const title = new Map(nodes.map((n) => [n.id, n.title]));
  const candidates: NodeCandidate[] = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    subject: n.subject,
    estMinutes: n.estMinutes,
    prelims: n.prelims,
    mains: n.mains,
    priority: nodePriority(n.freq, n.maxFreq, n.sectionShare, phase),
    mastery: m.get(n.id)?.mastery ?? level.get(n.section) ?? INITIAL_MASTERY,
    prereqs: n.prereqs,
    studied: !!m.get(n.id)?.studiedAt,
    source: n.source,
    pyqCount: n.freq.prelims + n.freq.mains,
  }));
  return {
    candidates,
    due: due.map((d) => ({ nodeId: d.nodeId, title: title.get(d.nodeId) ?? d.nodeId, cards: d.n })),
  };
}

/** Today's plan: generated once per day (carrying yesterday's unfinished tasks), then stable. */
export async function todayPlan(db: Db, uid: string, now: Date) {
  const day = istDay(now);
  let rows = await db
    .select()
    .from(s.planTasks)
    .where(and(eq(s.planTasks.uid, uid), eq(s.planTasks.day, day)))
    .orderBy(asc(s.planTasks.position));
  if (!rows.length) {
    const profile = (
      await db.select().from(s.learnerProfiles).where(eq(s.learnerProfiles.uid, uid))
    )[0];
    if (!profile?.onboardedAt) return { day, tasks: [], note: null, minutes: 0 };
    const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    const minutes = profile.weekdayMinutes[weekday] ?? 0;
    const carried = await rebalanceInto(db, uid, day);
    const { candidates, due } = await plannerInputs(db, uid, now);
    const tasks = buildDay({
      date: now,
      minutes,
      nodes: candidates,
      due,
      carried: carried.carried,
    });
    await insertTasks(db, uid, day, tasks);
    if (carried.note) {
      await db.insert(s.planNotes).values({ uid, day, note: carried.note }).onConflictDoNothing();
    }
    rows = await db
      .select()
      .from(s.planTasks)
      .where(and(eq(s.planTasks.uid, uid), eq(s.planTasks.day, day)))
      .orderBy(asc(s.planTasks.position));
  }
  const [note] = await db
    .select()
    .from(s.planNotes)
    .where(and(eq(s.planNotes.uid, uid), eq(s.planNotes.day, day)));
  const profile = (
    await db.select().from(s.learnerProfiles).where(eq(s.learnerProfiles.uid, uid))
  )[0];
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return {
    day,
    tasks: rows,
    note: note?.note ?? null,
    minutes: profile?.weekdayMinutes[weekday] ?? 0,
  };
}

/** SCHED-04: move unfinished learn/revise/practice tasks from earlier days to `day`. */
export async function rebalanceInto(db: Db, uid: string, day: string) {
  const missed = await db
    .select()
    .from(s.planTasks)
    .where(
      and(
        eq(s.planTasks.uid, uid),
        eq(s.planTasks.status, 'todo'),
        sql`${s.planTasks.day} < ${day}`,
      ),
    );
  if (!missed.length) return { carried: [] as PlanTask[], note: null };
  await db
    .update(s.planTasks)
    .set({ status: 'moved' })
    .where(
      inArray(
        s.planTasks.id,
        missed.map((t) => t.id),
      ),
    );
  // Revise tasks are regenerated from what is due; carry the rest.
  return rebalance(missed.filter((t) => t.kind !== 'revise').map(toPlanTask));
}

/** SCHED-05: "I only have N minutes": keep the best tasks today, move the rest to tomorrow. */
export async function replanToday(db: Db, uid: string, now: Date, minutes: number) {
  const { day, tasks } = await todayPlan(db, uid, now);
  const open = tasks.filter((t) => t.status === 'todo');
  const { keep, moved } = replan(open.map(toPlanTask), minutes);
  await db.delete(s.planTasks).where(
    inArray(
      s.planTasks.id,
      open.map((t) => t.id),
    ),
  );
  const done = tasks.filter((t) => t.status !== 'todo').length;
  if (keep.length) {
    await db
      .insert(s.planTasks)
      .values(keep.map((t, i) => ({ uid, day, position: done + i, ...t })));
  }
  if (moved.length) {
    const tomorrow = istDay(new Date(now.getTime() + 86_400_000));
    await db
      .insert(s.planTasks)
      .values(moved.map((t, i) => ({ uid, day: tomorrow, position: 100 + i, ...t })));
    const note = `${moved.length} task${moved.length === 1 ? '' : 's'} moved to tomorrow to fit ${minutes} minutes.`;
    await db
      .insert(s.planNotes)
      .values({ uid, day, note })
      .onConflictDoUpdate({ target: [s.planNotes.uid, s.planNotes.day], set: { note } });
  }
  return todayPlan(db, uid, now);
}

export async function completeTask(db: Db, uid: string, id: string, now: Date) {
  await db
    .update(s.planTasks)
    .set({ status: 'done', doneAt: now })
    .where(and(eq(s.planTasks.uid, uid), eq(s.planTasks.id, id)));
}

// --- Mastery, cards, mistakes -----------------------------------------------------------------

async function bumpMastery(
  db: Db,
  uid: string,
  nodeId: string,
  observed: number,
  studied: boolean,
  now: Date,
) {
  const [row] = await db
    .select()
    .from(s.nodeMastery)
    .where(and(eq(s.nodeMastery.uid, uid), eq(s.nodeMastery.nodeId, nodeId)));
  const next = updateMastery(row?.mastery ?? INITIAL_MASTERY, observed);
  await db
    .insert(s.nodeMastery)
    .values({ uid, nodeId, mastery: next, studiedAt: studied ? now : null, updatedAt: now })
    .onConflictDoUpdate({
      target: [s.nodeMastery.uid, s.nodeMastery.nodeId],
      set: {
        mastery: next,
        updatedAt: now,
        ...(studied ? { studiedAt: row?.studiedAt ?? now } : {}),
      },
    });
  return next;
}

export async function addCard(
  db: Db,
  uid: string,
  card: { nodeId: string; kind: 'node' | 'recall' | 'mistake'; front: string; back: string },
  now: Date,
) {
  const c = newCard(now);
  await db.insert(s.srsCards).values({ uid, ...card, state: toJson(c), due: c.due });
}

export async function dueCards(db: Db, uid: string, now: Date, nodeId?: string) {
  return db
    .select()
    .from(s.srsCards)
    .where(
      and(
        eq(s.srsCards.uid, uid),
        lte(s.srsCards.due, now),
        ...(nodeId ? [eq(s.srsCards.nodeId, nodeId)] : []),
      ),
    )
    .orderBy(asc(s.srsCards.due))
    .limit(50);
}

export async function gradeCard(db: Db, uid: string, id: string, g: SrsGrade, now: Date) {
  const [card] = await db
    .select()
    .from(s.srsCards)
    .where(and(eq(s.srsCards.uid, uid), eq(s.srsCards.id, id)));
  if (!card) return null;
  const next = grade(fromJson(card.state), now, g);
  await db
    .update(s.srsCards)
    .set({ state: toJson(next), due: next.due, reps: card.reps + 1 })
    .where(eq(s.srsCards.id, id));
  const mastery = await bumpMastery(db, uid, card.nodeId, GRADE_SCORE[g], false, now);
  return { due: next.due, mastery };
}

/** Learn session result: recall self-grades + PYQ answers → mastery, cards and mistakes. */
export async function recordLearn(
  db: Db,
  uid: string,
  nodeId: string,
  result: {
    recall: { q: string; a: string; got: boolean }[];
    answers: { pyqId: string; chosen: string | null }[];
  },
  now: Date,
) {
  const [node] = await db.select().from(s.syllabusNodes).where(eq(s.syllabusNodes.id, nodeId));
  if (!node) return null;
  const pyq = await recordAnswers(db, uid, result.answers, now);
  const recallScore = result.recall.length
    ? result.recall.filter((r) => r.got).length / result.recall.length
    : 0.6;
  const observed = pyq.total ? 0.5 * recallScore + 0.5 * (pyq.correct / pyq.total) : recallScore;
  const mastery = await bumpMastery(db, uid, nodeId, observed, true, now);
  // One revision unit per studied node, plus a card for every recall item missed.
  const existing = await db
    .select({ id: s.srsCards.id })
    .from(s.srsCards)
    .where(
      and(eq(s.srsCards.uid, uid), eq(s.srsCards.nodeId, nodeId), eq(s.srsCards.kind, 'node')),
    );
  if (!existing.length) {
    await addCard(
      db,
      uid,
      { nodeId, kind: 'node', front: `Recall the key points of: ${node.title}`, back: node.title },
      now,
    );
  }
  for (const r of result.recall.filter((x) => !x.got)) {
    await addCard(db, uid, { nodeId, kind: 'recall', front: r.q, back: r.a }, now);
  }
  return { mastery, pyq };
}

/** Score MCQ answers; every wrong one becomes a mistake (cause asked later) and a card. */
export async function recordAnswers(
  db: Db,
  uid: string,
  answers: { pyqId: string; chosen: string | null }[],
  now: Date,
) {
  if (!answers.length)
    return {
      correct: 0,
      total: 0,
      results: [] as { pyqId: string; correct: boolean; answer: string | null }[],
    };
  const rows = await db
    .select({
      id: s.pyqs.id,
      text: s.pyqs.text,
      answer: s.pyqs.answer,
      options: s.pyqs.options,
      nodeId: s.pyqTags.nodeId,
    })
    .from(s.pyqs)
    .leftJoin(s.pyqTags, and(eq(s.pyqTags.pyqId, s.pyqs.id), eq(s.pyqTags.primary, true)))
    .where(
      inArray(
        s.pyqs.id,
        answers.map((a) => a.pyqId),
      ),
    );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const results = [];
  for (const a of answers) {
    const r = byId.get(a.pyqId);
    if (!r?.answer) continue;
    const correct = a.chosen === r.answer;
    results.push({ pyqId: a.pyqId, correct, answer: r.answer });
    if (!correct) {
      await db
        .insert(s.mistakes)
        .values({
          uid,
          pyqId: a.pyqId,
          nodeId: r.nodeId,
          chosen: a.chosen,
          correct: r.answer,
          createdAt: now,
        });
      const right = r.options?.find((o) => o.key === r.answer);
      await addCard(
        db,
        uid,
        {
          nodeId: r.nodeId ?? 'unknown',
          kind: 'mistake',
          front: r.text,
          back: right ? `(${right.key}) ${right.text}` : r.answer,
        },
        now,
      );
    }
  }
  return { correct: results.filter((r) => r.correct).length, total: results.length, results };
}

/** Mastery heatmap (PED-03, PB-HEAT): per section, mastery decayed by recall probability. */
export async function heatmap(db: Db, uid: string, now: Date) {
  const [nodes, mastery, cards, sectionRows] = await Promise.all([
    kbNodes(db),
    db.select().from(s.nodeMastery).where(eq(s.nodeMastery.uid, uid)),
    db
      .select()
      .from(s.srsCards)
      .where(and(eq(s.srsCards.uid, uid), eq(s.srsCards.kind, 'node'))),
    db
      .select({ id: s.syllabusNodes.id, title: s.syllabusNodes.title })
      .from(s.syllabusNodes)
      .where(eq(s.syllabusNodes.kind, 'section')),
  ]);
  const titles = new Map(sectionRows.map((r) => [r.id, r.title]));
  const m = new Map(mastery.map((r) => [r.nodeId, r.mastery]));
  const r = new Map(cards.map((c) => [c.nodeId, retrievability(fromJson(c.state), now)]));
  const sections = new Map<string, { studied: number; total: number; sum: number }>();
  for (const n of nodes) {
    const t = sections.get(n.section) ?? { studied: 0, total: 0, sum: 0 };
    t.total++;
    if (m.has(n.id)) {
      t.studied++;
      t.sum += displayedMastery(m.get(n.id) ?? 0, r.get(n.id) ?? 1);
    }
    sections.set(n.section, t);
  }
  return [...sections].map(([sectionId, t]) => ({
    sectionId,
    title: titles.get(sectionId) ?? sectionId,
    studied: t.studied,
    total: t.total,
    mastery: t.studied ? Math.round((t.sum / t.total) * 100) / 100 : 0,
  }));
}
