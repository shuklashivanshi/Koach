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
