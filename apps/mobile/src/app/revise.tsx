import type { DueCards } from '@koach/shared';
import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Revise (UI_SPEC §10.7, SRS-01): due cards, flip, grade; FSRS schedules the next review.

type Card = DueCards['cards'][number];

export default function Revise() {
  const { c } = useTheme();
  const { task, node } = useLocalSearchParams<{ task?: string; node?: string }>();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    void api.dueCards(node).then((r) => setCards(r.cards));
  }, [node]);

  const grade = async (g: 'again' | 'hard' | 'good' | 'easy') => {
    const card = cards?.[i];
    if (!card) return;
    await api.grade(card.id, g);
    setShown(false);
    if (i + 1 >= (cards?.length ?? 0) && task) await api.taskDone(task);
    setI(i + 1);
  };

  const card = cards?.[i];
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
      <Text variant="heading">Revise</Text>
      {cards && !card && (
        <>
          <Text variant="heading">All caught up.</Text>
          <Text muted>Read something you love.</Text>
          <Button label="Back to today" onPress={() => router.replace('/today')} />
        </>
      )}
      {card && (
        <>
          <Text variant="caption" muted>
            {i + 1} of {cards?.length} ·{' '}
            {card.kind === 'mistake'
              ? 'from your mistakes'
              : card.kind === 'node'
                ? 'topic recall'
                : 'recall'}
          </Text>
          <PaperCard style={{ gap: space.md, minHeight: 160 }}>
            <Text>{card.front}</Text>
            {shown && <Text muted>{card.back}</Text>}
          </PaperCard>
          {!shown ? (
            <>
              <Button label="Show answer" onPress={() => setShown(true)} />
              <Button
                label="Make it stick"
                kind="text"
                onPress={() => router.push(`/stick/${encodeURIComponent(card.nodeId)}`)}
              />
            </>
          ) : (
            <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
              <Button label="Again" kind="secondary" onPress={() => void grade('again')} />
              <Button label="Hard" kind="secondary" onPress={() => void grade('hard')} />
              <Button label="Good" onPress={() => void grade('good')} />
              <Button label="Easy" kind="secondary" onPress={() => void grade('easy')} />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
