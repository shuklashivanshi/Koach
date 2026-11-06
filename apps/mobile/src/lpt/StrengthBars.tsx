import { space } from '@koach/ui';
import type { LptProfile } from '@koach/shared';
import { View } from 'react-native';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

const LABELS = {
  visual: 'Visual',
  auditory: 'Auditory',
  readwrite: 'Reading/Writing',
  kinesthetic: 'Kinesthetic',
} as const;

/** Four horizontal 0–100 bars; the strongest in leather, the rest in inkMuted (UI_SPEC §10.3). */
export function StrengthBars({ scores }: { scores: LptProfile['scores'] }) {
  const { c } = useTheme();
  const top = Math.max(...Object.values(scores));
  return (
    <View style={{ gap: space.sm }}>
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
        <View
          key={k}
          style={{ gap: 4 }}
          accessibilityLabel={`${LABELS[k]} ${Math.round(scores[k])}`}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption">{LABELS[k]}</Text>
            <Text variant="caption" muted>
              {Math.round(scores[k])}
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.linen }}>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                width: `${Math.max(2, scores[k])}%`,
                backgroundColor: scores[k] === top ? c.leather : c.inkMuted,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
