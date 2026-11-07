import { radius, space } from '@koach/ui';
import { View } from 'react-native';
import { useTheme } from './useTheme';

/** Quiet linen placeholder rows for loading states (UI_SPEC §8: no spinners outside buttons). */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const { c } = useTheme();
  return (
    <View testID="skeleton" accessibilityLabel="Loading" style={{ gap: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            height: space['2xl'],
            borderRadius: radius.card,
            backgroundColor: c.linen,
            opacity: 0.7,
          }}
        />
      ))}
    </View>
  );
}
