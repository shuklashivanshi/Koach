import { radius, space } from '@koach/ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from './useTheme';

/** Toast styled as a margin note (UI_SPEC §7); auto-dismisses after 3s. */
export function MarginNote({ message, onDone }: { message: string | null; onDone: () => void }) {
  const { c } = useTheme();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: space.md,
        right: space.md,
        bottom: space.xl,
        backgroundColor: c.linen,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      <Text variant="caption">{message}</Text>
    </View>
  );
}
