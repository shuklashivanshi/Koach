import type { Heatmap } from '@koach/shared';
import { space } from '@koach/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Memory heatmap (PB-HEAT, PED-03): per subject area, mastery decayed by how likely you are to
// recall it today.
export default function Library() {
  const { c } = useTheme();
  const [map, setMap] = useState<Heatmap | null>(null);
  useEffect(() => void api.mastery().then(setMap), []);
  const shade = (m: number) =>
    m >= 0.85 ? c.leather : m >= 0.6 ? c.gilt : m >= 0.3 ? c.plaid : c.linen;
  return (
    <ScrollView
      style={{ backgroundColor: c.parchment }}
      contentContainerStyle={{
        padding: space.lg,
        gap: space.md,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Button label="Back" kind="text" onPress={() => router.back()} />
      <Text variant="heading">Memory heatmap</Text>
      <Text variant="caption" muted>
        Darker means stronger recall today.
      </Text>
      {map?.sections.map((s) => (
        <View
          key={s.sectionId}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor: shade(s.mastery),
              borderWidth: 1,
              borderColor: c.hairline,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="caption">{s.title}</Text>
            <Text variant="caption" muted>
              {s.studied} of {s.total} studied
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
