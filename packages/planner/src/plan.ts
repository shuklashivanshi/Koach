import { type Phase, phaseFor, RATIOS } from './phases';

// The daily to-do (SCHED-01..03, PED-04): deterministic, time-boxed, fits the day's minutes.

export type TaskKind = 'learn' | 'revise' | 'practice' | 'ca';

export interface PlanTask {
  kind: TaskKind;
  nodeId: string | null;
  title: string;
  minutes: number;
  /** PB-FOCUS goal line, e.g. "Finish Ch 7 · Fundamental Rights + 3 PYQs". */
  goal: string;
  /** Why this task is here (shown under "Why this?"). */
  reason: string;
  /** "Indian Polity · M. Laxmikanth · Ch 7" for Learn tasks (SCHED-02). */
  source: string | null;
  priority: number;
}

export interface NodeCandidate {
  id: string;
  title: string;
  subject: string;
  estMinutes: number;
  prelims: boolean;
  mains: boolean;
  /** 0..1, normalised PYQ frequency + section weight. */
  priority: number;
  mastery: number;
  prereqs: string[];
  studied: boolean;
  source: { label: string; chapter: string } | null;
  pyqCount: number;
}

export interface DueReview {
  nodeId: string;
  title: string;
  cards: number;
}

export interface DayInput {
  date: Date;
  minutes: number;
  nodes: NodeCandidate[];
  due: DueReview[];
  /** Tasks carried over from missed days, already prioritised by the rebalance. */
  carried?: PlanTask[];
  /** Whether today's CA quiz exists (Phase 5); the slot is reserved either way. */
  caAvailable?: boolean;
  maxSubjects?: number;
}

const round5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);
const REVIEW_MIN_PER_CARD = 1.5;

/** Learn ordering: priority × (1 − mastery) ÷ minutes (higher first). */
export const learnScore = (n: NodeCandidate) =>
  (n.priority * (1 - n.mastery)) / Math.max(15, n.estMinutes);

export function eligibleForLearn(n: NodeCandidate, phase: Phase, studied: Set<string>): boolean {
  if (n.studied) return false;
  if (phase === 'prelims' && !n.prelims) return false;
  return n.prereqs.every((p) => studied.has(p));
}

export function buildDay(input: DayInput): PlanTask[] {
  const phase = phaseFor(input.date);
  const r = RATIOS[phase];
  const budget = Math.max(0, input.minutes);
  if (budget < 10) return [];
  const tasks: PlanTask[] = [];
  let left = budget;
  const take = (t: PlanTask) => {
    if (t.minutes > left) t.minutes = round5(left);
    if (t.minutes < 5 || left < 5) return false;
    tasks.push(t);
    left -= t.minutes;
    return true;
  };

  // 1. Carried-over tasks keep their place at the front (never silently dropped).
  for (const t of input.carried ?? []) take({ ...t });

  // 2. Revise: due reviews, up to the revise share (more if more is due, from Learn's share).
  const reviseCap = round5(budget * (r.revise + (input.due.length > 8 ? r.learn / 2 : 0)));
  let reviseLeft = reviseCap;
  for (const d of [...input.due].sort((a, b) => b.cards - a.cards)) {
    const minutes = round5(Math.min(reviseLeft, d.cards * REVIEW_MIN_PER_CARD));
    if (minutes < 5) break;
    if (
      take({
        kind: 'revise',
        nodeId: d.nodeId,
        title: `Revise: ${d.title}`,
        minutes,
        goal: `${d.cards} card${d.cards === 1 ? '' : 's'} due`,
        reason: 'Due for review now, before it fades.',
        source: null,
        priority: 1,
      })
    )
      reviseLeft -= minutes;
  }

  // 3. Current affairs slot.
  take({
    kind: 'ca',
    nodeId: null,
    title: 'Current affairs quiz',
    minutes: round5(budget * r.ca),
    goal: 'Today’s questions',
    reason: 'A daily link between the news and the syllabus.',
    source: null,
    priority: 0.6,
  });

  // 4. Practice: PYQs on studied nodes with the lowest mastery.
  const practiceNodes = input.nodes
    .filter((n) => n.studied && n.pyqCount > 0)
    .sort((a, b) => a.mastery - b.mastery || b.priority - a.priority);
  const practice = practiceNodes[0];
  if (practice) {
    const q = Math.min(15, practice.pyqCount);
    take({
      kind: 'practice',
      nodeId: practice.id,
      title: `PYQs: ${practice.title}`,
      minutes: round5(Math.min(budget * r.practice, q * 2)),
      goal: `${q} past questions`,
      reason: 'Practise where your recall is weakest.',
      source: null,
      priority: 0.7,
    });
  }

  // 5. Learn: greedy by score, prerequisites first, at most 2 subjects a day.
  const studied = new Set(input.nodes.filter((n) => n.studied).map((n) => n.id));
  const subjects = new Set<string>();
  const maxSubjects = input.maxSubjects ?? 2;
  const queue = input.nodes
    .filter((n) => eligibleForLearn(n, phase, studied))
    .sort((a, b) => learnScore(b) - learnScore(a));
  for (const n of queue) {
    if (left < 20) break;
    if (!subjects.has(n.subject) && subjects.size >= maxSubjects) continue;
    const pyqs = Math.min(3, n.pyqCount);
    const ok = take({
      kind: 'learn',
      nodeId: n.id,
      title: n.title,
      minutes: round5(Math.min(n.estMinutes, left)),
      goal: n.source
        ? `Finish ${n.source.chapter}${pyqs ? ` + ${pyqs} PYQs` : ''}`
        : `Cover ${n.title}${pyqs ? ` + ${pyqs} PYQs` : ''}`,
      reason:
        n.pyqCount > 0
          ? `Asked ${n.pyqCount} time${n.pyqCount === 1 ? '' : 's'} in past papers; not studied yet.`
          : 'Part of the syllabus you haven’t covered yet.',
      source: n.source ? `${n.source.label} · ${n.source.chapter}` : null,
      priority: n.priority,
    });
    if (ok) {
      subjects.add(n.subject);
      studied.add(n.id);
    }
  }
  // Display order (UI_SPEC §10.4): carried, Learn, Revise, CA, Practice; CA goes last until the
  // day's quiz exists, so the current task is always something the learner can start.
  const carried = new Set(tasks.slice(0, input.carried?.length ?? 0));
  const order: Record<TaskKind, number> = {
    learn: 1,
    revise: 2,
    ca: input.caAvailable ? 3 : 5,
    practice: 4,
  };
  return [...tasks].sort(
    (a, b) => (carried.has(a) ? 0 : order[a.kind]) - (carried.has(b) ? 0 : order[b.kind]),
  );
}

/** "I only have N minutes" (SCHED-05): keep the highest-yield tasks, move the rest. */
export function replan(
  tasks: PlanTask[],
  minutes: number,
): { keep: PlanTask[]; moved: PlanTask[] } {
  const rank = (t: PlanTask) =>
    (t.kind === 'revise' ? 3 : t.kind === 'learn' ? 2 : t.kind === 'practice' ? 1 : 0) + t.priority;
  const ordered = [...tasks].sort((a, b) => rank(b) - rank(a));
  const keep: PlanTask[] = [];
  const moved: PlanTask[] = [];
  let left = minutes;
  for (const t of ordered) {
    if (t.minutes <= left) {
      keep.push(t);
      left -= t.minutes;
    } else if (left >= 15 && t.kind !== 'ca') {
      // Trim one task to fit rather than dropping it outright; the remainder moves.
      const trimmed = round5(left - 2);
      keep.push({ ...t, minutes: trimmed });
      moved.push({ ...t, minutes: round5(t.minutes - trimmed) });
      left = 0;
    } else moved.push(t);
  }
  const order = new Map(tasks.map((t, i) => [t, i]));
  keep.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  return { keep, moved };
}

/** Nightly rebalance (SCHED-04): unfinished tasks move forward by priority with a short note. */
export function rebalance(missed: PlanTask[]): { carried: PlanTask[]; note: string | null } {
  const carried = missed.filter((t) => t.kind !== 'ca').sort((a, b) => b.priority - a.priority);
  if (!carried.length) return { carried, note: null };
  const n = carried.length;
  return {
    carried,
    note: `${n} task${n === 1 ? '' : 's'} moved to today: ${carried
      .slice(0, 2)
      .map((t) => t.title)
      .join(', ')}${n > 2 ? '…' : ''}.`,
  };
}
