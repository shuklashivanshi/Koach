import type { OptionalExplorer } from '@koach/shared';
import { layout, space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Field } from '@/lpt/games';
import { CoachSheet } from '@/optionals/CoachSheet';
import { componentLabel, fitDots, pct } from '@/optionals/format';
import { BandChart } from '@/ui/BandChart';
import { Button } from '@/ui/Button';
import { LoadError } from '@/ui/LoadError';
import { MasteryDots } from '@/ui/MasteryDots';
import { SkeletonRows } from '@/ui/Skeleton';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Optional explorer (OPT-02, OPT-05; UI_SPEC 10.11) and recording the decision (OPT-04).

const STYLE_LABELS = {
  analytical: 'Analytical',
  factual: 'Factual',
  diagrams: 'Diagrams',
  numericals: 'Numericals',
} as const;

function StyleBar({ label, value }: { label: string; value: number }) {
  const { c } = useTheme();
  const v = Math.min(1, Math.max(0, value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Text variant="caption" style={{ width: space['3xl'] + space.md }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: space.xs, backgroundColor: c.linen }}>
        <View style={{ width: `${v * 100}%`, height: '100%', backgroundColor: c.leather }} />
      </View>
      <Text variant="caption" muted style={{ width: space['2xl'], textAlign: 'right' }}>
        {`${Math.round(v * 100)}%`}
      </Text>
    </View>
  );
}

export default function Explorer() {
  const { c } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [o, setO] = useState<OptionalExplorer | null>(null);
  const [failed, setFailed] = useState(false);
  const [whyFit, setWhyFit] = useState(false);
  const [reasons, setReasons] = useState('');
  const [saved, setSaved] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    api.optional(slug).then(setO, () => setFailed(true));
  }, [slug]);
  useEffect(load, [load]);

  const scroll = (children: React.ReactNode) => (
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
      {children}
    </ScrollView>
  );

  if (failed) return scroll(<LoadError onRetry={load} />);
  if (!o) return scroll(<SkeletonRows count={5} />);

  return scroll(
    <>
      <Text variant="heading">{o.name}</Text>
      <Text muted>{o.summary}</Text>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stat value={`~${o.hours}`} label="HRS" testID="stat-hours" />
        <Stat
          value={`${Math.round(o.gsOverlap * 100)}%`}
          label="GS overlap"
          testID="stat-overlap"
        />
        <Stat value={pct(o.success.rate)} label="Success" testID="stat-success" />
      </View>
      {o.overlapsWith.length > 0 && (
        <Text variant="caption" muted>
          {`Overlaps with ${o.overlapsWith.slice(0, 3).join(', ')}`}
        </Text>
      )}

      <Text variant="label" muted smallCaps>
        Official success by year
      </Text>
      {o.years.length > 0 ? (
        <>
          <BandChart years={o.years} pooled={o.success} />
          <Text variant="caption" muted>
            {`From the UPSC annual reports, ${o.success.years} ${o.success.years === 1 ? 'year' : 'years'} pooled.`}
          </Text>
        </>
      ) : (
        <Text variant="caption" muted>
          No candidates in the years read
        </Text>
      )}

      <Text variant="label" muted smallCaps>
        Your fit
      </Text>
      {o.fit ? (
        <View style={{ gap: space.xs }}>
          <MasteryDots n={fitDots(o.fit.score)} />
          <Text variant="caption" muted>
            {o.fit.reason}
          </Text>
          <Button
            label="Why?"
            kind="text"
            align="start"
            testID="why-fit"
            onPress={() => setWhyFit(!whyFit)}
          />
          {whyFit &&
            Object.entries(o.fit.components).map(([k, v]) => (
              <Text key={k} variant="caption" muted>
                {`${componentLabel(k)} · ${Math.round(v * 100)} of 100`}
              </Text>
            ))}
        </View>
      ) : (
        <Button
          label="Take the fit quiz"
          kind="text"
          align="start"
          onPress={() => router.push('/optionals/quiz')}
        />
      )}

      <Text variant="label" muted smallCaps>
        How answers lean
      </Text>
      <View style={{ gap: space.xs }}>
        {(Object.keys(STYLE_LABELS) as (keyof typeof STYLE_LABELS)[]).map((k) => (
          <StyleBar key={k} label={STYLE_LABELS[k]} value={o.answerStyle[k]} />
        ))}
        <Text variant="caption" muted>
          Estimated from the syllabus, not from past papers
        </Text>
      </View>

      {o.books.length > 0 && (
        <>
          <Text variant="label" muted smallCaps>
            Read
          </Text>
          {o.books.map((b) => (
            <Text key={b} variant="caption">
              {b}
            </Text>
          ))}
        </>
      )}
      <Text variant="label" muted smallCaps>
        Syllabus
      </Text>
      {o.topics.map((t) => (
        <Text key={t} variant="caption">
          · {t}
        </Text>
      ))}

      <Button
        label="Compare"
        kind="secondary"
        onPress={() => router.push(`/optionals?compare=${encodeURIComponent(o.slug)}`)}
      />
      <Button label="Ask the coach about this" kind="text" onPress={() => setCoachOpen(true)} />
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
      <CoachSheet visible={coachOpen} slugs={[o.slug]} onClose={() => setCoachOpen(false)} />
    </>,
  );
}
