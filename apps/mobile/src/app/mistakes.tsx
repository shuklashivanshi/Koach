import type { MistakeList } from '@koach/shared';
import { space } from '@koach/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Mistakes notebook (PB-MISTAKE, PED-02): one-tap cause per wrong answer; monthly recurring traps.

const CAUSES = [
  ['didnt_know', 'Didn’t know'],
  ['misread', 'Misread'],
  ['eliminated_wrong', 'Eliminated wrong'],
  ['guessed', 'Guessed'],
] as const;

export default function Mistakes() {
  const { c } = useTheme();
  const [list, setList] = useState<MistakeList | null>(null);
  const load = () => void api.mistakes().then(setList);
  useEffect(load, []);

  const traps = Object.entries(list?.traps ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <ScrollView
      style={{ backgroundColor: c.parchment }}
      contentContainerStyle={{
        padding: space.lg,
        gap: space.lg,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Button label="Back" kind="text" onPress={() => router.back()} />
      <Text variant="heading">Mistakes</Text>
      {traps.length > 0 && (
        <PaperCard style={{ gap: space.xs }}>
          <Text variant="label" muted smallCaps>
            Your recurring traps · 30 days
          </Text>
          {traps.map(([cause, n]) => (
            <Text key={cause} variant="caption">
              {CAUSES.find((x) => x[0] === cause)?.[1] ?? cause} · {n}
            </Text>
          ))}
        </PaperCard>
      )}
      {list && !list.mistakes.length && <Text muted>No mistakes logged yet.</Text>}
      {list?.mistakes.map((m) => (
        <PaperCard key={m.id} style={{ gap: space.sm }}>
          <Text numberOfLines={4}>{m.text ?? m.pyqId}</Text>
          <Text variant="caption" muted>
            You chose ({m.chosen ?? '–'}) · answer ({m.correct ?? '?'})
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {CAUSES.map(([id, label]) => (
              <Chip
                key={id}
                label={label}
                on={m.cause === id}
                onPress={() => void api.mistakeCause(m.id, id).then(load)}
              />
            ))}
          </View>
        </PaperCard>
      ))}
    </ScrollView>
  );
}
