import { radius, space } from '@koach/ui';
import { View } from 'react-native';
import { useTheme } from './useTheme';

const DOTS = [1, 2, 3, 4, 5] as const;

/** Five small dots, the first n filled in sage (UI_SPEC §7). */
export function MasteryDots({ n, testID }: { n: number; testID?: string }) {
  const { c } = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Fit ${n} of 5`}
      style={{ flexDirection: 'row', gap: space.xs }}
    >
      {DOTS.map((i) => (
        <View
          key={i}
          style={{
            width: space.sm,
            height: space.sm,
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: i <= n ? c.sage : c.hairline,
            backgroundColor: i <= n ? c.sage : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
