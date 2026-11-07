import type { DecisionStatus, OptionalList } from '@koach/shared';
import { layout, space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { pct } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { LoadError } from '@/ui/LoadError';
import { PaperCard } from '@/ui/PaperCard';
import { SkeletonRows } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Choose your optional (UI_SPEC §10.11): deadline, quiz, explore, compare, coach, decide.

export default function Optionals() {
  const { c } = useTheme();
  const [status, setStatus] = useState<DecisionStatus | null>(null);
  const [list, setList] = useState<OptionalList['optionals']>([]);
  const { compare } = useLocalSearchParams<{ compare?: string }>();
  const [picked, setPicked] = useState<string[]>(compare ? [compare] : []);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    void api.decision().then(setStatus, () => undefined);
    api.optionals().then(
      (r) => {
        setList(r.optionals);
        setLoaded(true);
      },
      () => setFailed(true),
    );
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (compare) setPicked((p) => (p.includes(compare) ? p : [...p, compare].slice(-3)));
  }, [compare]);
  const toggle = (slug: string) =>
    setPicked(
      picked.includes(slug) ? picked.filter((x) => x !== slug) : [...picked, slug].slice(-3),
    );

  return (
    <ScrollView
      style={{ backgroundColor: c.parchment }}
      contentContainerStyle={{
        padding: space.lg,
        gap: space.md,
        maxWidth: layout.maxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Choose your optional</Text>
      {status && (
        <Text variant="caption" muted>
          {status.chosen
            ? `Chosen: ${list.find((o) => o.slug === status.chosen)?.name ?? status.chosen}`
            : `Decide by ${new Date(`${status.deadline}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${status.daysLeft} days left`}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button
          label={status?.quizTaken ? 'Retake the fit quiz' : 'Take the fit quiz'}
          onPress={() => router.push('/optionals/quiz')}
        />
        <Button
          label="Ask the coach"
          kind="secondary"
          onPress={() => router.push(`/optionals/coach?slugs=${picked.join(',')}`)}
        />
      </View>
      {status?.quizTaken && (
        <Button
          label="Your fits"
          kind="text"
          align="start"
          onPress={() => router.push('/optionals/quiz?view=results')}
        />
      )}
      {picked.length >= 2 && (
        <Button
          label={`Compare ${picked.length}`}
          kind="secondary"
          onPress={() => router.push(`/optionals/compare?slugs=${picked.join(',')}`)}
        />
      )}
      <Text variant="caption" muted>
        Tap a name to explore it; tick up to three to compare. Success rates are from official UPSC
        annual reports.
      </Text>
      {failed && <LoadError onRetry={load} />}
      {!failed && !loaded && <SkeletonRows count={6} />}
      {list.map((o) => (
        <PaperCard key={o.slug} style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/optionals/${o.slug}`)}>
              <Text>{o.name}</Text>
              <Text variant="caption" muted>
                {o.success.rate === null
                  ? 'No candidates in the years read'
                  : `${pct(o.success.rate)} recommended · ${o.success.appeared} appeared${o.success.smallSample ? ' · small sample' : ''}`}
              </Text>
            </Pressable>
            <Chip
              label={picked.includes(o.slug) ? '✓' : '+'}
              on={picked.includes(o.slug)}
              onPress={() => toggle(o.slug)}
            />
          </View>
        </PaperCard>
      ))}
    </ScrollView>
  );
}
