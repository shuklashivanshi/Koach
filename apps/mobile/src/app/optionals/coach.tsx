import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { api } from '@/api/client';
import { Field } from '@/lpt/games';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Decision Coach (OPT-03): answers from the evidence, stress tests, and the deadline.
export default function OptionalCoach() {
  const { c } = useTheme();
  const { slugs } = useLocalSearchParams<{ slugs?: string }>();
  const list = (slugs ?? '').split(',').filter(Boolean);
  const [q, setQ] = useState('');
  const [thread, setThread] = useState<{ q: string; a: string; test: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true);
    try {
      const r = await api.askCoach(q, list);
      setThread([...thread, { q, a: r.answer, test: r.stressTest }]);
      setQ('');
    } finally {
      setBusy(false);
    }
  };
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
      <Text variant="heading">Decision coach</Text>
      {list.length === 0 && (
        <Text variant="caption" muted>
          Tip: pick optionals to compare first, so answers use their numbers.
        </Text>
      )}
      {thread.map((t, i) => (
        <PaperCard key={i} style={{ gap: space.xs }}>
          <Text variant="caption" muted>
            {t.q}
          </Text>
          <Text>{t.a}</Text>
          {t.test && <Text variant="caption">Try this: {t.test}</Text>}
        </PaperCard>
      ))}
      <Field
        value={q}
        onChangeText={setQ}
        placeholder="e.g. I'm an engineer. Can I take Sociology?"
        lines={3}
      />
      <Button label="Ask" busy={busy} disabled={q.trim().length < 3} onPress={() => void ask()} />
    </ScrollView>
  );
}
