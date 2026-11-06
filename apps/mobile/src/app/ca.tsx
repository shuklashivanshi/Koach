import type { CaResults, CaToday } from '@koach/shared';
import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { Field } from '@/lpt/games';
import { Button } from '@/ui/Button';
import { WindowEngraving } from '@/ui/Engraving';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Current affairs (UI_SPEC §10.9, CA-02..06): today's linked items, then the verified quiz.

type Result = CaResults['results'][number];

export default function CurrentAffairs() {
  const { c } = useTheme();
  const { task } = useLocalSearchParams<{ task?: string }>();
  const [data, setData] = useState<CaToday | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [link, setLink] = useState('');
  const [shared, setShared] = useState(false);

  useEffect(() => void api.caToday().then(setData), []);

  const submit = async () => {
    const out = await api.caAnswers(
      Object.entries(chosen).map(([questionId, c2]) => ({ questionId, chosen: c2 })),
      task,
    );
    setResults(Object.fromEntries(out.results.map((r) => [r.questionId, r])));
  };

  if (data && !data.items.length && !data.questions.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.parchment,
          padding: space.lg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
        }}
      >
        <WindowEngraving />
        <Text variant="heading">Today’s paper isn’t in yet.</Text>
        <Text muted>Check back after 6 am.</Text>
        <Button label="Back" kind="text" onPress={() => router.back()} />
      </View>
    );
  }
  const open = data?.questions.filter((q) => !q.result && !reported.has(q.id)) ?? [];
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
      <Text variant="heading">Current affairs</Text>

      {data?.questions.map((q, i) => {
        const r = results[q.id];
        const done = q.result ?? (r ? { chosen: chosen[q.id] ?? null, correct: r.correct } : null);
        if (reported.has(q.id)) return null;
        return (
          <PaperCard key={q.id} style={{ gap: space.sm }}>
            <Text variant="caption" muted>
              Question {i + 1} · {q.source.name}
            </Text>
            <Text>{q.stem}</Text>
            {q.options.map((o) => (
              <Chip
                key={o.key}
                label={`(${o.key}) ${o.text}${r?.answer === o.key ? '  ✓' : ''}`}
                on={(done?.chosen ?? chosen[q.id]) === o.key}
                onPress={() => !done && setChosen({ ...chosen, [q.id]: o.key })}
              />
            ))}
            {r && (
              <Text variant="caption" muted>
                {r.explanation}
              </Text>
            )}
            {done && (
              <Text variant="caption" muted>
                {done.correct ? 'Correct.' : 'Saved to your mistakes notebook.'}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label="Source"
                kind="text"
                onPress={() => void Linking.openURL(q.source.url)}
              />
              <Button
                label="Report"
                kind="text"
                onPress={() =>
                  void api.caReport(q.id).then(() => setReported(new Set([...reported, q.id])))
                }
              />
            </View>
          </PaperCard>
        );
      })}
      {open.length > 0 && Object.keys(results).length === 0 && (
        <Button
          label="Check answers"
          onPress={() => void submit()}
          disabled={!Object.keys(chosen).length}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <Text variant="label" muted smallCaps>
            In the news
          </Text>
          {data.items.map((it) => (
            <PaperCard key={it.id} style={{ gap: space.xs }}>
              <Text variant="caption" muted>
                {it.source}
              </Text>
              <Text>{it.summary ?? it.title}</Text>
              {it.nodes.length > 0 && (
                <Text variant="caption" muted>
                  Links to: {it.nodes.map((n) => n.title).join(' · ')}
                </Text>
              )}
              <Button
                label="Official source"
                kind="text"
                onPress={() => void Linking.openURL(it.url)}
              />
            </PaperCard>
          ))}
        </>
      )}

      <Text variant="label" muted smallCaps>
        Share a link
      </Text>
      <Field value={link} onChangeText={setLink} placeholder="An official release or report URL" />
      <Button
        label={shared ? 'Added for tomorrow' : 'Add'}
        kind="secondary"
        disabled={!/^https?:\/\//.test(link) || shared}
        onPress={() => void api.caShare(link).then(() => setShared(true))}
      />
    </ScrollView>
  );
}
