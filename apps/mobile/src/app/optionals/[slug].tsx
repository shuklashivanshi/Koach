import type { OptionalExplorer } from '@koach/shared';
import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { pct } from '@/app/optionals';
import { Field } from '@/lpt/games';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Optional explorer (OPT-02) and recording the decision (OPT-04).

export function Facts({ o }: { o: OptionalExplorer }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="caption">
        ~{o.hours} hours first pass · {o.topics.length} syllabus units
      </Text>
      <Text variant="caption">
        GS/Essay overlap {Math.round(o.gsOverlap * 100)}%
        {o.overlapsWith.length ? ` · ${o.overlapsWith.slice(0, 3).join(', ')}` : ''}
      </Text>
      <Text variant="caption">
        Official success {pct(o.success.rate)}
        {o.success.rate !== null
          ? ` (95% band ${pct(o.success.low)}–${pct(o.success.high)}, ${o.success.appeared} appeared, ${o.success.years} years)`
          : ''}
        {o.success.smallSample ? ' · small sample, read with care' : ''}
      </Text>
      <Text variant="caption" muted>
        Answers lean{' '}
        {Object.entries(o.answerStyle)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([k]) => k)
          .join(' and ')}
      </Text>
    </View>
  );
}

export default function Explorer() {
  const { c } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [o, setO] = useState<OptionalExplorer | null>(null);
  const [reasons, setReasons] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => void api.optional(slug).then(setO), [slug]);
  if (!o) return <View style={{ flex: 1, backgroundColor: c.parchment }} />;
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
      <Text variant="heading">{o.name}</Text>
      <Text muted>{o.summary}</Text>
      <PaperCard>
        <Facts o={o} />
      </PaperCard>
      {o.years.length > 0 && (
        <PaperCard style={{ gap: 2 }}>
          <Text variant="label" muted smallCaps>
            By year (official)
          </Text>
          {o.years.map((y) => (
            <Text key={y.examYear} variant="caption">
              {y.examYear}: {y.recommended} of {y.appeared} recommended
            </Text>
          ))}
        </PaperCard>
      )}
      <Text variant="label" muted smallCaps>
        Syllabus
      </Text>
      {o.topics.map((t) => (
        <Text key={t} variant="caption">
          · {t}
        </Text>
      ))}
      {o.books.length > 0 && (
        <>
          <Text variant="label" muted smallCaps>
            Standard books
          </Text>
          {o.books.map((b) => (
            <Text key={b} variant="caption">
              {b}
            </Text>
          ))}
        </>
      )}
      <Button
        label="Ask the coach about this"
        kind="secondary"
        onPress={() => router.push(`/optionals/coach?slugs=${o.slug}`)}
      />
      <Text variant="label" muted smallCaps>
        Decide
      </Text>
      <Field
        value={reasons}
        onChangeText={setReasons}
        placeholder="Why this optional, in your words"
        lines={3}
      />
      <Button
        label={saved ? 'Added to your plan' : `Choose ${o.name}`}
        disabled={reasons.trim().length < 3 || saved}
        onPress={() => void api.chooseOptional(o.slug, reasons).then(() => setSaved(true))}
      />
    </ScrollView>
  );
}
