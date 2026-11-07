import type { Phase } from './phases';

/**
 * Node priority (SCHED-03, v1.0): normalised PYQ frequency + the node's section weightage.
 * In the Prelims phase, Prelims frequency counts double. Topic likelihood joins in v1.1.
 */
export function nodePriority(
  freq: { prelims: number; mains: number },
  maxFreq: { prelims: number; mains: number },
  sectionShare: number,
  phase: Phase,
): number {
  const p = maxFreq.prelims ? freq.prelims / maxFreq.prelims : 0;
  const m = maxFreq.mains ? freq.mains / maxFreq.mains : 0;
  const freqScore = phase === 'prelims' ? (2 * p + m) / 3 : (p + m) / 2;
  return Math.round((0.7 * freqScore + 0.3 * Math.min(1, sectionShare * 5)) * 1000) / 1000;
}

/**
 * Base weight by paper, so plans stay sensible before PYQ tags exist: GS papers full weight;
 * Essay lower; CSAT lowest (it is qualifying).
 */
export const PAPER_WEIGHT: Record<string, number> = {
  prelims_gs1: 1,
  gs1: 1,
  gs2: 1,
  gs3: 1,
  gs4: 0.8,
  essay: 0.4,
  csat: 0.3,
};

export const withPaperWeight = (priority: number, paper: string) =>
  Math.round((0.75 * priority + 0.25 * (PAPER_WEIGHT[paper] ?? 0.5)) * 1000) / 1000;

/** Minutes the plan gives one optional syllabus unit (D-05). */
export const OPTIONAL_UNIT_MINUTES = 90;

/**
 * Base priority of the chosen optional's first unit; later units step down so order holds.
 * 0.45 gave only 1 unit in 14 foundation days against a realistic GS pool (D-05 needs 2+), so it
 * was raised to 0.5, the smallest 0.05 step that passes the planner pool test.
 */
export const OPTIONAL_PRIORITY_BASE = 0.5;

/**
 * Priority of the chosen optional's unit at `index` in syllabus order (OPT-04, D-05): below GS
 * so GS keeps leading, and strictly decreasing so earlier units are planned first.
 */
export const optionalUnitPriority = (index: number) =>
  Math.round((OPTIONAL_PRIORITY_BASE - index * 0.002) * 1000) / 1000;
