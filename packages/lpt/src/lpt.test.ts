import { findHits } from '@koach/guard';
import { describe, expect, it } from 'vitest';
import {
  applyEvidence,
  forms,
  patternScores,
  profileLine,
  retestDue,
  scoreGrid,
  scoreMapPins,
  scoreOrder,
  scoreRecallLists,
} from './index';

describe('learning pattern test', () => {
  it('has two parallel forms of equal shape and clean content', () => {
    for (const f of Object.values(forms)) {
      expect(f.places).toHaveLength(7);
      expect(f.grid.map((s) => s.length)).toEqual([3, 4, 5, 6, 7, 8, 9]);
      expect(f.lists.map((l) => l.length)).toEqual([5, 7, 9]);
      expect(f.passage.text.split(/\s+/).length).toBeGreaterThan(70);
      expect(f.passage.ideaUnits.length).toBe(9);
      expect(f.events).toHaveLength(6);
      expect(findHits(f)).toEqual([]);
    }
    expect(forms.A.places.map((p) => p.name)).not.toEqual(forms.B.places.map((p) => p.name));
  });

  it('scores map pins by distance', () => {
    const places = forms.A.places;
    const exact = Object.fromEntries(places.map((p) => [p.name, p]));
    expect(scoreMapPins(places, exact)).toBe(1);
    expect(scoreMapPins(places, {})).toBe(0);
    const off = Object.fromEntries(places.map((p) => [p.name, { lat: p.lat + 2, lon: p.lon }]));
    expect(scoreMapPins(places, off)).toBeGreaterThan(0.6);
  });

  it('scores grid span, list recall and ordering', () => {
    expect(
      scoreGrid(
        [
          [1, 2, 3],
          [4, 5, 6, 7],
        ],
        [
          [1, 2, 3],
          [4, 5, 7, 6],
        ],
      ),
    ).toBe(0.75);
    expect(scoreRecallLists([['repo rate', 'Article 21']], ['art 21 and the Repo-rate'])).toBe(1);
    expect(scoreRecallLists([['a1', 'b2'], ['c3']], ['a1', ''])).toBeCloseTo(1 / 3);
    const ev = forms.A.events;
    expect(
      scoreOrder(
        ev,
        ev.map((e) => e.label),
      ),
    ).toBe(1);
    expect(
      scoreOrder(
        ev,
        [...ev].reverse().map((e) => e.label),
      ),
    ).toBe(0);
  });

  it('blends immediate and delayed into 0–100 per pattern', () => {
    const s = patternScores(
      { mapPins: 1, grid: 0.5, listen: 0.6, readWrite: 0.4, arrange: 1 },
      { mapPins: 0.5, grid: 0.5, listen: 0.5, readWrite: 0.2, arrange: 1 },
    );
    expect(s).toEqual({ visual: 65, auditory: 56, readwrite: 32, kinesthetic: 100 });
  });

  it('describes strengths without labelling the person', () => {
    const line = profileLine({ visual: 80, auditory: 78, readwrite: 50, kinesthetic: 40 });
    expect(line).toBe('Pictures and places stick best for you, with what you hear close behind.');
    expect(profileLine({ visual: 20, auditory: 30, readwrite: 90, kinesthetic: 40 })).toBe(
      'What you read and write sticks best for you.',
    );
    expect(line.toLowerCase()).not.toMatch(/you are a|learner/);
  });

  it('updates from evidence and schedules a retest', () => {
    expect(applyEvidence(50, 1)).toBe(52.5);
    expect(applyEvidence(50, 0)).toBe(47.5);
    expect(retestDue(new Date('2026-11-01T00:00:00Z')).toISOString()).toBe(
      '2026-12-27T00:00:00.000Z',
    );
  });
});
