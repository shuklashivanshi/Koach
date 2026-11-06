import type { PracticeSet } from '@koach/shared';
import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Practice: Prelims PYQs on a studied node; wrong answers go to the mistakes notebook (PED-02).

export default function Practice() {
  const { c } = useTheme();
  const { nodeId, task } = useLocalSearchParams<{ nodeId: string; task?: string }>();
  const [set, setSet] = useState<PracticeSet | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<
    string,
    { correct: boolean; answer: string | null }
  > | null>(null);

  useEffect(() => {
    void api.practice(nodeId).then(setSet);
  }, [nodeId]);

  const submit = async () => {
    const out = await api.practiceResult(
      Object.entries(chosen).map(([pyqId, c2]) => ({ pyqId, chosen: c2 })),
      task,
    );
    setResults(Object.fromEntries(out.results.map((r) => [r.pyqId, r])));
  };

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
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Past questions</Text>
      {set && !set.pyqs.length && <Text muted>No keyed questions on this topic yet.</Text>}
      {set?.pyqs.map((p) => (
        <PaperCard key={p.id} style={{ gap: space.sm }}>
          <Text variant="caption" muted>
            Prelims {p.year}
          </Text>
          <Text>{p.text}</Text>
          {p.options.map((o) => (
            <Chip
              key={o.key}
              label={`(${o.key}) ${o.text}${results?.[p.id]?.answer === o.key ? '  ✓' : ''}`}
              on={chosen[p.id] === o.key}
              onPress={() => !results && setChosen({ ...chosen, [p.id]: o.key })}
            />
          ))}
        </PaperCard>
      ))}
      {set && set.pyqs.length > 0 && !results && (
        <Button label="Check" onPress={() => void submit()} />
      )}
      {results && (
        <>
          <Text>
            {Object.values(results).filter((r) => r.correct).length} of{' '}
            {Object.keys(results).length} correct.
          </Text>
          <Button
            label="Tag your mistakes"
            kind="secondary"
            onPress={() => router.push('/mistakes')}
          />
          <Button label="Back to today" onPress={() => router.replace('/today')} />
        </>
      )}
    </ScrollView>
  );
}
