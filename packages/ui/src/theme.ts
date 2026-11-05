// Design tokens from docs/UI_SPEC.md (Light Academia). Screens never use raw hex values or
// pixel numbers; they read these tokens. Kept free of React Native imports so it stays testable.

export const colors = {
  /** "Summer Library", the default theme. */
  light: {
    parchment: '#F5EFE4',
    cream: '#FBF8F2',
    linen: '#ECE3D2',
    hairline: '#DCD0BC',
    ink: '#3A2E24',
    inkMuted: '#6B5B4E',
    leather: '#8A5A3B',
    onLeather: '#FBF8F2',
    sage: '#5A6A4A',
    gilt: '#9C7A3C',
    rosewood: '#9E3F35',
    plaid: '#C9B79C',
  },
  /** "Lamplight", the opt-in dark theme. */
  lamplight: {
    parchment: '#211A14',
    cream: '#2B231B',
    linen: '#3A3026',
    hairline: '#4A3E32',
    ink: '#EDE3D1',
    inkMuted: '#B3A28C',
    leather: '#D2A57A',
    onLeather: '#211A14',
    sage: '#A9B892',
    gilt: '#D9B872',
    rosewood: '#E08A7C',
    plaid: '#4A3E32',
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorTokens = { [K in keyof (typeof colors)['light']]: string };

/** Text colour tokens that must meet WCAG AA on parchment and cream. */
export const textTokens = ['ink', 'inkMuted', 'leather', 'sage', 'rosewood'] as const;
/** Gilt is decorative, or text at 18px and larger only (3.5:1). */
export const decorativeOnly = ['gilt'] as const;

/** Soft "window light" on the Today header, by local hour. */
export const sunlight = [
  { fromHour: 5, toHour: 11, color: '#FFF3D6', opacity: 0.6, name: 'morning' },
  { fromHour: 11, toHour: 17, color: '#FFF8EA', opacity: 0.4, name: 'noon' },
  { fromHour: 17, toHour: 21, color: '#F6DFC0', opacity: 0.55, name: 'golden' },
] as const;

export function sunlightFor(hour: number): (typeof sunlight)[number] | null {
  return sunlight.find((s) => hour >= s.fromHour && hour < s.toHour) ?? null;
}

export const fonts = {
  display: 'CormorantGaramond_600SemiBold',
  text: 'Literata_400Regular',
  textItalic: 'Literata_400Regular_Italic',
  textMedium: 'Literata_500Medium',
  textSemiBold: 'Literata_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 39 },
  heading: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29 },
  title: { fontFamily: fonts.textSemiBold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.text, fontSize: 16, lineHeight: 25 },
  label: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 17, letterSpacing: 0.6 },
  caption: { fontFamily: fonts.textItalic, fontSize: 12, lineHeight: 17 },
  numeral: { fontFamily: fonts.textMedium, fontSize: 28, lineHeight: 31 },
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 } as const;

export const radius = { card: 12, button: 10, chip: 999, sheet: 20, indexCard: 6 } as const;

export const motion = {
  screenPushMs: 240,
  sheetSpring: { damping: 20, stiffness: 180 },
  taskCompleteMs: 200,
  flipMs: 380,
  progressMs: 600,
  reducedMs: 150,
} as const;

export const layout = { maxContentWidth: 560, minTouchTarget: 44, buttonHeight: 52 } as const;

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [
      number,
      number,
      number,
    ];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
