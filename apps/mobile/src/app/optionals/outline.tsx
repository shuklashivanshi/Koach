import type { OptionalOutline } from '@koach/shared';
import { layout, space } from '@koach/ui';
import { router } from 'expo-router';
import { Check } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { formatWeekday } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { LoadError } from '@/ui/LoadError';
import { SkeletonRows } from '@/ui/Skeleton';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Coverage outline of the chosen optional (OPT-04): its units by paper, studied or planned.
// A studied unit is a sage check plus the word; a todo unit is an empty circle, so colour is
// never the only signal.

type Unit = OptionalOutline['units'][number];

const hoursText = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}`;

function UnitRow({ u }: { u: Unit }) {
  const { c } = useTheme();
  const studied = u.status === 'studied';
  const state = studied
    ? 'Studied'
    : u.scheduledOn
      ? `Planned ${formatWeekday(u.scheduledOn)}`
      : null;
  const caption = state ? `${u.minutes} min · ${state}` : `${u.minutes} min`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${u.title}, ${caption}`}
      onPress={() => router.push(`/learn/${encodeURIComponent(u.nodeId)}`)}
      style={{
        minHeight: layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.xs,
        borderBottomWidth: 1,
        borderBottomColor: c.hairline,
      }}
    >
      {studied ? (
        <Check size={space.md} weight="light" color={c.sage} />
      ) : (
        <View
          style={{
            width: space.md,
            height: space.md,
            borderRadius: space.md,
            borderWidth: 1,
            borderColor: c.hairline,
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text>{u.title}</Text>
        <Text variant="caption" muted>
          {caption}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Outline() {
  const { c } = useTheme();
  const [data, setData] = useState<OptionalOutline | null | undefined>(undefined);
  const [reasons, setReasons] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    void api.decision().then(
      (d) => setReasons(d.reasons),
      () => undefined,
    );
    api.outline().then(setData, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const papers: { key: string; title: string | null; units: Unit[] }[] = [];
  for (const u of data?.units ?? []) {
    const key = u.paper ?? '';
    let group = papers.find((p) => p.key === key);
    if (!group) {
      group = { key, title: u.paper ? `Paper ${u.paper}` : null, units: [] };
      papers.push(group);
    }
    group.units.push(u);
  }
  const minutes = data?.units[0]?.minutes ?? 90;

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
      {failed && <LoadError onRetry={load} />}
      {!failed && data === undefined && <SkeletonRows count={6} />}
      {!failed && data === null && (
        <>
          <Text variant="heading">Your optional</Text>
          <Text muted>No optional chosen yet.</Text>
          <Button label="Choose your optional" onPress={() => router.push('/optionals')} />
        </>
      )}
      {!failed && data && (
        <>
          <Text variant="heading">Your optional</Text>
          <Text variant="title">{data.name}</Text>
          {reasons && (
            <Text variant="caption" muted>
              {reasons}
            </Text>
          )}
          <Button
            label="Change my optional"
            kind="text"
            align="start"
            onPress={() => router.push('/optionals')}
          />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Stat value={String(data.units.length)} label="Units" testID="stat-units" />
            <Stat value={String(data.studied)} label="Studied" testID="stat-studied" />
            <Stat
              value={`~${data.firstPassHours}`}
              label="First pass hrs"
              testID="stat-first-pass"
            />
          </View>
          <Text variant="caption" muted>
            {`Each unit is a ${minutes}-minute Learn task, about ${hoursText(data.plannedHours)} hours in all. A full first pass is about ${data.firstPassHours} hours.`}
          </Text>
          {data.paused && (
            <Text variant="caption" muted>
              Paused until Prelims is over.
            </Text>
          )}
          {papers.map((p) => (
            <View key={p.key} style={{ gap: space.xs }}>
              {p.title && (
                <Text variant="label" muted smallCaps>
                  {p.title}
                </Text>
              )}
              {p.units.map((u) => (
                <UnitRow key={u.nodeId} u={u} />
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
