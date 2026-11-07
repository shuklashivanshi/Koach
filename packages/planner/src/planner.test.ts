import { describe, expect, it } from 'vitest';
import {
  buildDay,
  displayedMastery,
  forecastTouches,
  grade,
  type NodeCandidate,
  newCard,
  nodePriority,
  OPTIONAL_UNIT_MINUTES,
  optionalUnitPriority,
  phaseFor,
  PRELIMS,
  rebalance,
  replan,
  retrievability,
  updateMastery,
  withPaperWeight,
} from './index';

const day = new Date('2026-11-09T06:00:00+05:30');
const node = (id: string, over: Partial<NodeCandidate> = {}): NodeCandidate => ({
  id,
  title: `Node ${id}`,
  subject: 'polity',
  estMinutes: 60,
  prelims: true,
  mains: true,
  priority: 0.5,
  mastery: 0.1,
  prereqs: [],
  studied: false,
  source: { label: 'Indian Polity · M. Laxmikanth', chapter: 'Ch 7 · Fundamental Rights' },
  pyqCount: 4,
  ...over,
});

describe('planner', () => {
  it('fills the day without exceeding available minutes, with a source on every Learn task', () => {
    const tasks = buildDay({
      date: day,
      minutes: 150,
      due: [{ nodeId: 'x', title: 'Preamble', cards: 10 }],
      nodes: [node('a', { priority: 0.9 }), node('b'), node('c', { studied: true, mastery: 0.3 })],
    });
    const total = tasks.reduce((a, t) => a + t.minutes, 0);
    expect(total).toBeLessThanOrEqual(150);
    expect(total).toBeGreaterThanOrEqual(120);
    expect(tasks.map((t) => t.kind)).toEqual(
      expect.arrayContaining(['revise', 'ca', 'practice', 'learn']),
    );
    const learn = tasks.filter((t) => t.kind === 'learn');
    expect(learn[0]?.nodeId).toBe('a');
    expect(learn.every((t) => t.source?.includes('Ch 7'))).toBe(true);
    expect(learn[0]?.goal).toBe('Finish Ch 7 · Fundamental Rights + 3 PYQs');
  });

  it('respects prerequisites, the 2-subject cap and the Prelims phase', () => {
    const nodes = [
      node('p1', { subject: 'polity', priority: 0.9, prereqs: ['p0'] }),
      node('p0', { subject: 'polity', priority: 0.2, estMinutes: 30 }),
      node('e1', { subject: 'economy', priority: 0.8, estMinutes: 30 }),
      node('h1', { subject: 'history', priority: 0.7, estMinutes: 30 }),
      node('m1', { subject: 'ethics', prelims: false, priority: 1, estMinutes: 30 }),
    ];
    const learn = (date: Date) =>
      buildDay({ date, minutes: 600, due: [], nodes })
        .filter((t) => t.kind === 'learn')
        .map((t) => t.nodeId);
    const nov = learn(day);
    expect(nov).not.toContain('p1'); // prerequisite p0 not studied before today
    expect(
      new Set(nov.map((id) => nodes.find((n) => n.id === id)?.subject)).size,
    ).toBeLessThanOrEqual(2);
    expect(learn(new Date('2027-03-01T06:00:00+05:30'))).not.toContain('m1');
    expect(phaseFor(new Date('2027-03-01T06:00:00+05:30'))).toBe('prelims');
  });

  it('replans to N minutes keeping due reviews first, and rebalances missed work', () => {
    const tasks = buildDay({
      date: day,
      minutes: 180,
      due: [{ nodeId: 'x', title: 'Preamble', cards: 12 }],
      nodes: [node('a'), node('b', { subject: 'economy' })],
    });
    const { keep, moved } = replan(tasks, 45);
    expect(keep.reduce((a, t) => a + t.minutes, 0)).toBeLessThanOrEqual(45);
    expect(keep.map((t) => t.kind)).toContain('revise');
    expect(moved.length).toBeGreaterThan(0);
    const r = rebalance(moved);
    expect(r.note).toMatch(/moved to today/);
    expect(r.carried.every((t) => t.kind !== 'ca')).toBe(true);
  });

  it('schedules with FSRS and forecasts at least 3 touches before Prelims for a node learned now', () => {
    let card = newCard(day);
    card = grade(card, day, 'good');
    expect(new Date(card.due).getTime()).toBeGreaterThan(day.getTime());
    const touches = forecastTouches(card, day, PRELIMS);
    expect(touches.length).toBeGreaterThanOrEqual(3);
    const later = new Date(day.getTime() + 30 * 86_400_000);
    expect(retrievability(card, later)).toBeLessThan(1);
  });

  it('updates and decays mastery', () => {
    expect(updateMastery(0.4, 1)).toBe(0.58);
    expect(displayedMastery(0.8, 0.5)).toBe(0.4);
  });

  it('puts the CA task before practice only when the quiz exists', () => {
    const base = {
      date: day,
      minutes: 240,
      due: [],
      nodes: [node('a'), node('c', { studied: true })],
    };
    const kinds = (caAvailable: boolean) => buildDay({ ...base, caAvailable }).map((t) => t.kind);
    expect(kinds(false).at(-1)).toBe('ca');
    expect(kinds(true).indexOf('ca')).toBeLessThan(kinds(true).indexOf('practice'));
  });

  it('ranks GS above CSAT when no PYQ data exists', () => {
    expect(withPaperWeight(0, 'gs2')).toBeGreaterThan(withPaperWeight(0, 'csat'));
  });

  it('weights Prelims frequency more in the Prelims phase', () => {
    const f = { prelims: 6, mains: 0 };
    const max = { prelims: 6, mains: 6 };
    expect(nodePriority(f, max, 0.1, 'prelims')).toBeGreaterThan(
      nodePriority(f, max, 0.1, 'foundation'),
    );
  });

  describe('optional units (OPT-04, D-05)', () => {
    const unit = (i: number, over: Partial<NodeCandidate> = {}): NodeCandidate =>
      node(`opt.${i}`, {
        subject: 'optional',
        prelims: false,
        mains: true,
        estMinutes: OPTIONAL_UNIT_MINUTES,
        priority: optionalUnitPriority(i),
        source: null,
        pyqCount: 0,
        ...over,
      });
    const learnIds = (date: Date, nodes: NodeCandidate[], minutes = 300) =>
      buildDay({ date, minutes, nodes, due: [] })
        .filter((t) => t.kind === 'learn')
        .map((t) => t.nodeId);

    it('plans an optional unit in the foundation phase and never from 1 Feb 2027', () => {
      const nodes = [unit(0)];
      expect(learnIds(new Date('2026-11-09T06:00:00+05:30'), nodes)).toContain('opt.0');
      expect(learnIds(new Date('2027-01-31T06:00:00+05:30'), nodes)).toContain('opt.0');
      expect(learnIds(new Date('2027-02-01T06:00:00+05:30'), nodes)).not.toContain('opt.0');
      expect(learnIds(new Date('2027-04-10T06:00:00+05:30'), nodes)).not.toContain('opt.0');
    });

    it('plans units in order: unit n+1 only after unit n is studied', () => {
      const chain = (studiedUpTo: number) =>
        [0, 1, 2].map((i) =>
          unit(i, {
            prereqs: i > 0 ? [`opt.${i - 1}`] : [],
            studied: i < studiedUpTo,
          }),
        );
      const d = new Date('2026-11-09T06:00:00+05:30');
      // Not studied yet: at most unit 0 appears, never 1 or 2 ahead of it.
      expect(learnIds(d, chain(0))).toEqual(['opt.0']);
      expect(learnIds(d, chain(1))).toEqual(['opt.1']);
      expect(learnIds(d, chain(2))).toEqual(['opt.2']);
    });

    it('reaches the plan within 14 foundation days while GS keeps at least half the Learn minutes', () => {
      const gs = Array.from({ length: 40 }, (_, i) =>
        node(`gs.${i}`, {
          subject: `gs${i % 6}`,
          priority: 0.25 + (0.65 * i) / 39,
          estMinutes: 35 + ((i * 11) % 56),
          prelims: true,
          mastery: 0.1,
        }),
      );
      const optional = Array.from({ length: 14 }, (_, i) =>
        unit(i, { prereqs: i > 0 ? [`opt.${i - 1}`] : [] }),
      );
      const studied = new Set<string>();
      let gsMinutes = 0;
      let optMinutes = 0;
      let optUnits = 0;
      for (let d = 0; d < 14; d++) {
        const date = new Date(Date.UTC(2026, 10, 9 + d, 0, 30));
        const nodes = [...gs, ...optional].map((n) => ({ ...n, studied: studied.has(n.id) }));
        const learn = buildDay({ date, minutes: 180, nodes, due: [] }).filter(
          (t) => t.kind === 'learn',
        );
        for (const t of learn) {
          studied.add(t.nodeId as string);
          if (t.nodeId?.startsWith('opt.')) {
            optMinutes += t.minutes;
            optUnits++;
          } else gsMinutes += t.minutes;
        }
      }
      expect(optUnits).toBeGreaterThanOrEqual(2);
      expect(gsMinutes).toBeGreaterThanOrEqual(optMinutes);
    });
  });
});
