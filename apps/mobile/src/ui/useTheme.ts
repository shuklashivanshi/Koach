import { colors, type ColorTokens, type ThemeName } from '@koach/ui';

// Light ("Summer Library") is the default. Lamplight arrives with the Appearance setting.
export function useTheme(): { name: ThemeName; c: ColorTokens } {
  return { name: 'light', c: colors.light };
}
