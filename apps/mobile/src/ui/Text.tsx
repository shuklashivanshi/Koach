import { type as typeScale } from '@koach/ui';
import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from './useTheme';

type Variant = keyof typeof typeScale;

export function Text({
  variant = 'body',
  muted = false,
  smallCaps = false,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean; smallCaps?: boolean }) {
  const { c } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: muted ? c.inkMuted : c.ink },
        smallCaps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
