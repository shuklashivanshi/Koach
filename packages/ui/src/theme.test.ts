import { describe, expect, it } from 'vitest';
import { colors, contrastRatio, decorativeOnly, sunlightFor, textTokens } from './theme';

describe('design tokens (docs/UI_SPEC.md §3)', () => {
  it('match the spec hex values', () => {
    expect(colors.light).toMatchObject({
      parchment: '#F5EFE4',
      cream: '#FBF8F2',
      ink: '#3A2E24',
      leather: '#8A5A3B',
      rosewood: '#9E3F35',
    });
    expect(colors.lamplight.parchment).toBe('#211A14');
    expect(colors.lamplight.leather).toBe('#D2A57A');
  });

  for (const theme of ['light', 'lamplight'] as const) {
    for (const bg of ['parchment', 'cream'] as const) {
      for (const token of textTokens) {
        it(`${theme}: ${token} on ${bg} meets WCAG AA`, () => {
          expect(contrastRatio(colors[theme][token], colors[theme][bg])).toBeGreaterThanOrEqual(
            4.5,
          );
        });
      }
    }
    it(`${theme}: button text on leather meets WCAG AA`, () => {
      expect(contrastRatio(colors[theme].onLeather, colors[theme].leather)).toBeGreaterThanOrEqual(
        4.5,
      );
    });
  }

  it('flags gilt as decorative only', () => {
    expect(decorativeOnly).toContain('gilt');
    expect(contrastRatio(colors.light.gilt, colors.light.parchment)).toBeLessThan(4.5);
  });

  it('picks sunlight by hour', () => {
    expect(sunlightFor(7)?.name).toBe('morning');
    expect(sunlightFor(18)?.name).toBe('golden');
    expect(sunlightFor(23)).toBeNull();
  });
});
