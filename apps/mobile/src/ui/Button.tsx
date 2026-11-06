import { layout, radius, space, type as typeScale } from '@koach/ui';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from './useTheme';

type Kind = 'primary' | 'secondary' | 'text' | 'danger';

/** UI_SPEC §7: one primary per screen; secondary is outlined; text buttons are leather text. */
export function Button({
  label,
  onPress,
  kind = 'primary',
  busy = false,
  disabled = false,
  testID,
  align = 'center',
}: {
  label: string;
  onPress: () => void;
  kind?: Kind;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
  /** 'start' left-aligns a text button (top-of-screen Back links). */
  align?: 'center' | 'start';
}) {
  const { c } = useTheme();
  const filled = kind === 'primary' || kind === 'danger';
  const fill = kind === 'danger' ? c.rosewood : c.leather;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: kind === 'text' ? layout.minTouchTarget : layout.buttonHeight,
          borderRadius: radius.button,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.lg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        align === 'start' && { alignSelf: 'flex-start', paddingHorizontal: 0 },
        filled && { backgroundColor: fill, alignSelf: 'stretch' },
        kind === 'secondary' && {
          borderWidth: 1,
          borderColor: c.hairline,
          alignSelf: 'stretch',
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={filled ? c.onLeather : c.leather} />
      ) : (
        <Text
          style={[
            typeScale.label,
            { fontSize: 15, letterSpacing: 0.3 },
            { color: filled ? c.onLeather : kind === 'secondary' ? c.ink : c.leather },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
