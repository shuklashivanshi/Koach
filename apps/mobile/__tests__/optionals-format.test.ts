import { bestPerRow, componentLabel, fitDots, pct, type CompareItem } from '@/optionals/format';

test('pct formats a rate or an em dash', () => {
  expect(pct(null)).toBe('—');
  expect(pct(0.0812)).toBe('8.1%');
  expect(pct(0)).toBe('0.0%');
});

test('fitDots is round(score x 5) clamped to 1..5', () => {
  expect(fitDots(0.93)).toBe(5);
  expect(fitDots(0.41)).toBe(2);
  expect(fitDots(0.05)).toBe(1);
  expect(fitDots(0)).toBe(1);
  expect(fitDots(1.4)).toBe(5);
  expect(fitDots(-0.2)).toBe(1);
});

test('componentLabel gives plain words and falls back to the key', () => {
  expect(componentLabel('interest')).toBe('What you enjoy');
  expect(componentLabel('background')).toBe('Your degree');
  expect(componentLabel('overlap')).toBe('GS and Essay overlap');
  expect(componentLabel('writingStyle')).toBe('Writing style');
  expect(componentLabel('materials')).toBe('Books and papers');
  expect(componentLabel('time')).toBe('Your hours');
  expect(componentLabel('stability')).toBe('Steady results');
  expect(componentLabel('mystery')).toBe('mystery');
});

const item = (slug: string, over: Partial<CompareItem> = {}): CompareItem => ({
  slug,
  hours: 400,
  topicsCount: 30,
  gsOverlap: 0.3,
  materials: 0.5,
  success: { rate: 0.08, smallSample: false },
  fit: null,
  ...over,
});

test('bestPerRow marks the lowest hours and fewest units, the highest overlap and materials', () => {
  const r = bestPerRow([
    item('a', { hours: 300, topicsCount: 40, gsOverlap: 0.2, materials: 0.9 }),
    item('b', { hours: 500, topicsCount: 20, gsOverlap: 0.6, materials: 0.4 }),
    item('c', { hours: 700, topicsCount: 30, gsOverlap: 0.4, materials: 0.5 }),
  ]);
  expect(r.hours).toEqual(['a']);
  expect(r.units).toEqual(['b']);
  expect(r.gsOverlap).toEqual(['b']);
  expect(r.materials).toEqual(['a']);
});

test('ties give every tied slug the mark; an all-equal row marks nobody', () => {
  const r = bestPerRow([
    item('a', { hours: 300 }),
    item('b', { hours: 300 }),
    item('c', { hours: 500 }),
  ]);
  expect(r.hours).toEqual(['a', 'b']);
  expect(r.units).toEqual([]);
  expect(r.gsOverlap).toEqual([]);
});

test('success is crowned only among non-small samples with a rate', () => {
  const r = bestPerRow([
    item('a', { success: { rate: 0.2, smallSample: true } }),
    item('b', { success: { rate: 0.09, smallSample: false } }),
    item('c', { success: { rate: 0.05, smallSample: false } }),
    item('d', { success: { rate: null, smallSample: false } }),
  ]);
  expect(r.success).toEqual(['b']);
});

test('success has no winner when fewer than two items are eligible', () => {
  expect(
    bestPerRow([
      item('a', { success: { rate: 0.2, smallSample: true } }),
      item('b', { success: { rate: 0.1, smallSample: true } }),
    ]).success,
  ).toEqual([]);
  expect(
    bestPerRow([
      item('a', { success: { rate: 0.2, smallSample: true } }),
      item('b', { success: { rate: 0.1, smallSample: false } }),
    ]).success,
  ).toEqual([]);
});

test('fit is crowned only when every item has a fit', () => {
  expect(bestPerRow([item('a', { fit: 0.8 }), item('b', { fit: null })]).fit).toEqual([]);
  expect(bestPerRow([item('a', { fit: 0.8 }), item('b', { fit: 0.6 })]).fit).toEqual(['a']);
});
