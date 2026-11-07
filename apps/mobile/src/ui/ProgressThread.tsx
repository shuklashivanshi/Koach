import { space } from '@koach/ui';
import { View } from 'react-native';
import { useTheme } from './useTheme';

/** A 2px line on a linen track with a leather fill, like a bookmark ribbon (UI_SPEC §7). */
export function ProgressThread({ value }: { value: number }) {
  const { c } = useTheme();
  const v = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={{ height: space.xs / 2, backgroundColor: c.linen }}
    >
      <View style={{ width: `${v * 100}%`, height: '100%', backgroundColor: c.leather }} />
    </View>
  );
}
