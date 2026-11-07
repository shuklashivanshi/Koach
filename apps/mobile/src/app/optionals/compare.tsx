import type { OptionalCompare, OptionalExplorer } from '@koach/shared';
import { layout, space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'phosphor-react-native';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { CoachSheet } from '@/optionals/CoachSheet';
import { type BestRow, bestPerRow, fitDots, pct } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { LoadError } from '@/ui/LoadError';
import { MasteryDots } from '@/ui/MasteryDots';
import { SkeletonRows } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Compare 2–3 optionals side by side (OPT-02, OPT-05; UI_SPEC 10.11): one row per factor, the
// best value per row marked with a sage check (plus text, never colour alone).

const num = (n: number) => n.toLocaleString('en-IN');

type Row = {
  label: string;
  best?: BestRow;
  cell: (o: OptionalExplorer) => ReactNode;
};

const ROWS: Row[] = [
  { label: 'Hours', best: 'hours', cell: (o) => <Text>{`~${o.hours}`}</Text> },
  { label: 'Units', best: 'units', cell: (o) => <Text>{o.topics.length}</Text> },
  {
    label: 'GS overlap',
    best: 'gsOverlap',
    cell: (o) => <Text>{`${Math.round(o.gsOverlap * 100)}%`}</Text>,
  },
  {
    label: 'Official success',
    best: 'success',
    cell: (o) => (
      <View>
        <Text>{pct(o.success.rate)}</Text>
        {o.success.rate !== null && (
          <Text variant="caption" muted>
            {`${pct(o.success.low)}-${pct(o.success.high)}`}
          </Text>
        )}
        {o.success.smallSample && (
          <Text variant="caption" muted>
            few candidates
          </Text>
        )}
      </View>
    ),
  },
  { label: 'Appeared', cell: (o) => <Text>{num(o.success.appeared)}</Text> },
  {
    label: 'Books and papers',
    best: 'materials',
    cell: (o) => <MasteryDots n={fitDots(o.materials)} name="Books and papers" />,
  },
  {
    label: 'Your fit',
    best: 'fit',
    cell: (o) => (o.fit ? <MasteryDots n={fitDots(o.fit.score)} /> : <Text muted>—</Text>),
  },
];

export default function Compare() {
  const { c } = useTheme();
  const { slugs } = useLocalSearchParams<{ slugs: string }>();
  const [data, setData] = useState<OptionalCompare | null>(null);
  const [failed, setFailed] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    api
      .compareOptionals((slugs ?? '').split(',').filter(Boolean))
      .then(setData, () => setFailed(true));
  }, [slugs]);
  useEffect(load, [load]);

  const items = data?.optionals ?? [];
  const best = bestPerRow(
    items.map((o) => ({
      slug: o.slug,
      hours: o.hours,
      topicsCount: o.topics.length,
      gsOverlap: o.gsOverlap,
      materials: o.materials,
      success: { rate: o.success.rate, smallSample: o.success.smallSample },
      fit: o.fit?.score ?? null,
    })),
  );
  const labelFlex = 1.1;

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
      <Text variant="heading">Compare</Text>
      {failed && <LoadError onRetry={load} />}
      {!failed && !data && <SkeletonRows count={5} />}
      {data && (
        <View testID="compare-table" style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: labelFlex }} />
            {items.map((o) => (
              <Pressable
                key={o.slug}
                accessibilityRole="link"
                accessibilityLabel={`Explore ${o.name}`}
                onPress={() => router.push(`/optionals/${o.slug}`)}
                style={{ flex: 1 }}
              >
                <Text variant="title" numberOfLines={3} style={{ color: c.leather }}>
                  {o.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {ROWS.map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                gap: space.sm,
                paddingTop: space.sm,
                borderTopWidth: 1,
                borderColor: c.hairline,
              }}
            >
              <Text variant="label" muted style={{ flex: labelFlex }}>
                {row.label}
              </Text>
              {items.map((o) => (
                <View
                  key={o.slug}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: space.xs }}
                >
                  {row.cell(o)}
                  {row.best && best[row.best].includes(o.slug) && (
                    <View
                      testID={`best-${row.best}-${o.slug}`}
                      accessible
                      accessibilityLabel="Best in this row"
                    >
                      <Check size={space.md} weight="light" color={c.sage} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
          {items.some((o) => !o.fit) && (
            <Button
              label="Take the fit quiz"
              kind="text"
              align="start"
              onPress={() => router.push('/optionals/quiz')}
            />
          )}
        </View>
      )}
      <Button
        label="Ask the coach to compare"
        kind="secondary"
        onPress={() => setCoachOpen(true)}
      />
      <CoachSheet
        visible={coachOpen}
        slugs={(slugs ?? '').split(',').filter(Boolean)}
        onClose={() => setCoachOpen(false)}
      />
    </ScrollView>
  );
}
