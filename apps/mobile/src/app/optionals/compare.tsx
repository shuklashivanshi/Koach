import type { OptionalCompare } from '@koach/shared';
import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { api } from '@/api/client';
import { Facts } from '@/app/optionals/[slug]';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Compare 2–3 optionals side by side (OPT-02).
export default function Compare() {
  const { c } = useTheme();
  const { slugs } = useLocalSearchParams<{ slugs: string }>();
  const [data, setData] = useState<OptionalCompare | null>(null);
  useEffect(
    () => void api.compareOptionals((slugs ?? '').split(',').filter(Boolean)).then(setData),
    [slugs],
  );
  return (
    <ScrollView
      style={{ backgroundColor: c.parchment }}
      contentContainerStyle={{
        padding: space.lg,
        gap: space.md,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Compare</Text>
      {data?.optionals.map((o) => (
        <PaperCard key={o.slug} style={{ gap: space.xs }}>
          <Text>{o.name}</Text>
          <Facts o={o} />
          <Button label="Explore" kind="text" onPress={() => router.push(`/optionals/${o.slug}`)} />
        </PaperCard>
      ))}
      <Button
        label="Ask the coach to compare"
        kind="secondary"
        onPress={() => router.push(`/optionals/coach?slugs=${slugs}`)}
      />
    </ScrollView>
  );
}
