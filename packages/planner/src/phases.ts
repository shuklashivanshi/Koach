// Phase-based time ratios (PB-SWITCH, SCHED-03). Dates are calendar days in IST.

export const PRELIMS = new Date('2027-05-23T00:00:00+05:30');
export const FIRST_PASS_DEADLINE = new Date('2027-02-15T00:00:00+05:30');
export const PRELIMS_INTENSIVE_FROM = new Date('2027-02-01T00:00:00+05:30');
/** Mains 2027 starts on 20 Aug (UPSC Calendar 2027). */
export const MAINS_FROM = new Date('2027-08-20T00:00:00+05:30');

export type Phase = 'foundation' | 'prelims';
export interface Ratios {
  learn: number;
  revise: number;
  ca: number;
  practice: number;
}

export const RATIOS: Record<Phase, Ratios> = {
  foundation: { learn: 0.5, revise: 0.2, ca: 0.15, practice: 0.15 },
  prelims: { learn: 0.15, revise: 0.4, ca: 0.15, practice: 0.3 },
};

export const phaseFor = (day: Date): Phase =>
  day < PRELIMS_INTENSIVE_FROM ? 'foundation' : 'prelims';

export const daysUntil = (from: Date, to: Date) =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
