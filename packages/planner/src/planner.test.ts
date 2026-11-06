import { describe, expect, it } from 'vitest';
import {
  buildDay,
  displayedMastery,
  forecastTouches,
  grade,
  type NodeCandidate,
  newCard,
  nodePriority,
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
});
