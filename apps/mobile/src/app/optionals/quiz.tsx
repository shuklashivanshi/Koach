import type { FitQuiz, FitRanking } from '@koach/shared';
import { space } from '@koach/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { Field } from '@/lpt/games';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Fit Quiz (OPT-01): about 10 minutes; ranked top 5 with reasons, surprising fits, and Why?.

const BACKGROUNDS = [
  'engineering',
  'science',
  'medicine',
  'commerce',
  'economics',
  'humanities',
  'law',
  'literature',
  'agriculture',
  'management',
] as const;
const INTERESTS = [
  'society',
  'politics',
  'history',
  'economy',
  'environment',
  'technology',
  'mathematics',
  'life sciences',
  'physical sciences',
  'philosophy',
  'law',
  'management',
  'literature',
  'geography',
  'psychology',
  'statistics',
];
const READING = ['theory', 'data', 'narratives', 'debates'] as const;
const STYLE = ['analytical', 'factual', 'diagrams', 'numericals'] as const;
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export default function Quiz() {
  const { c } = useTheme();
  const [q, setQ] = useState<FitQuiz>({
    background: 'engineering',
    interests: [],
    reading: [],
    answerStyle: [],
    hours: 350,
    languages: [],
    risk: 0.3,
  });
  const [langs, setLangs] = useState('');
  const [result, setResult] = useState<FitRanking | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const toggle = <T extends string>(list: T[], v: T, max = 6) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v].slice(-max);

  const submit = async () =>
    setResult(
      await api.fitQuiz({
        ...q,
        languages: langs
          .split(',')
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      }),
    );

  if (result) {
    const card = (r: FitRanking['top'][number]) => (
      <PaperCard key={r.slug} style={{ gap: space.xs }}>
        <Text>{r.name}</Text>
        <Text variant="caption" muted>
          {r.reason}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label="Explore" kind="text" onPress={() => router.push(`/optionals/${r.slug}`)} />
          <Button label="Why?" kind="text" onPress={() => setWhy(why === r.slug ? null : r.slug)} />
        </View>
        {why === r.slug &&
          Object.entries(r.components).map(([k, v]) => (
            <Text key={k} variant="caption" muted>
              {k} {Math.round(v * 100)} × weight {result.weights[k]}
            </Text>
          ))}
      </PaperCard>
    );
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
        <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
        <Text variant="heading">Your best fits</Text>
        {result.top.map(card)}
        {result.surprising.length > 0 && (
          <>
            <Text variant="label" muted smallCaps>
              Surprising fits
            </Text>
            {result.surprising.map(card)}
          </>
        )}
        <Button
          label="Compare the top three"
          kind="secondary"
          onPress={() =>
            router.push(
              `/optionals/compare?slugs=${result.top
                .slice(0, 3)
                .map((r) => r.slug)
                .join(',')}`,
            )
          }
        />
      </ScrollView>
    );
  }

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
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Fit quiz</Text>
      <Text variant="label" muted smallCaps>
        Your degree
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {BACKGROUNDS.map((b) => (
          <Chip
            key={b}
            label={cap(b)}
            on={q.background === b}
            onPress={() => setQ({ ...q, background: b })}
          />
        ))}
      </View>
      <Text variant="label" muted smallCaps>
        Subjects you enjoy (up to 6)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {INTERESTS.map((i) => (
          <Chip
            key={i}
            label={cap(i)}
            on={q.interests.includes(i)}
            onPress={() => setQ({ ...q, interests: toggle(q.interests, i) })}
          />
        ))}
      </View>
      <Text variant="label" muted smallCaps>
        What you like to read
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {READING.map((r) => (
          <Chip
            key={r}
            label={cap(r)}
            on={q.reading.includes(r)}
            onPress={() => setQ({ ...q, reading: toggle(q.reading, r, 4) })}
          />
        ))}
      </View>
      <Text variant="label" muted smallCaps>
        How you like to answer
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {STYLE.map((st) => (
          <Chip
            key={st}
            label={cap(st)}
            on={q.answerStyle.includes(st)}
            onPress={() => setQ({ ...q, answerStyle: toggle(q.answerStyle, st, 4) })}
          />
        ))}
      </View>
      <Text variant="label" muted smallCaps>
        Hours for the optional before Mains
      </Text>
      <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
        {[200, 300, 400, 500, 700].map((h) => (
          <Chip
            key={h}
            label={`${h}h`}
            on={q.hours === h}
            onPress={() => setQ({ ...q, hours: h })}
          />
        ))}
      </View>
      <Text variant="label" muted smallCaps>
        Languages you could write literature in
      </Text>
      <Field
        value={langs}
        onChangeText={setLangs}
        placeholder="e.g. hindi, english (or leave empty)"
      />
      <Text variant="label" muted smallCaps>
        Your appetite for risk
      </Text>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {(
          [
            ['Play it safe', 0.1],
            ['Balanced', 0.4],
            ['Happy to bet', 0.8],
          ] as const
        ).map(([l, v]) => (
          <Chip key={l} label={l} on={q.risk === v} onPress={() => setQ({ ...q, risk: v })} />
        ))}
      </View>
      <Button label="See my fits" onPress={() => void submit()} disabled={!q.interests.length} />
    </ScrollView>
  );
}
