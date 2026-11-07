import type { FitQuiz, FitRanking } from '@koach/shared';
import { layout, space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { Field } from '@/lpt/games';
import { componentLabel, fitDots } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { LoadError } from '@/ui/LoadError';
import { MasteryDots } from '@/ui/MasteryDots';
import { ProgressThread } from '@/ui/ProgressThread';
import { SkeletonRows } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Fit Quiz (OPT-01, UI_SPEC 10.11): one question per screen, then the ranked top 5 with Why?.

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
const HOURS = [200, 300, 400, 500, 700];
const RISK = [
  ['Play it safe', 0.1],
  ['Balanced', 0.4],
  ['Happy to bet', 0.8],
] as const;
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

type Step = 'degree' | 'interests' | 'reading' | 'style' | 'hours' | 'language' | 'risk';
const STEPS: Step[] = ['degree', 'interests', 'reading', 'style', 'hours', 'language', 'risk'];
const HEADINGS: Record<Step, string> = {
  degree: 'Your degree',
  interests: 'What you enjoy',
  reading: 'How you read',
  style: 'How you answer',
  hours: 'Your hours',
  language: 'Your language',
  risk: 'Your risk',
};
const HINTS: Record<Step, string> = {
  degree: 'Choose one.',
  interests: 'Choose up to six.',
  reading: 'Choose up to four.',
  style: 'Choose up to four.',
  hours: 'For the optional, before Mains.',
  language: 'Languages you could write literature in. Leave empty if none.',
  risk: 'How much would you bet on a harder optional?',
};

type Answers = Omit<FitQuiz, 'background'> & { background: FitQuiz['background'] | null };
const toggle = <T extends string>(list: T[], v: T, max: number) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v].slice(-max);

export default function Quiz() {
  const { c } = useTheme();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const reopen = view === 'results';
  const [step, setStep] = useState(0);
  const [q, setQ] = useState<Answers>({
    background: null,
    interests: [],
    reading: [],
    answerStyle: [],
    hours: 400,
    languages: [],
    risk: 0.4,
  });
  const [langs, setLangs] = useState('');
  const [result, setResult] = useState<FitRanking | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(reopen);

  const reopenResults = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api.fits().then(
      (r) => {
        setResult(r);
        setLoading(false);
      },
      (e: unknown) => {
        // No stored answers yet: start at the first question.
        if ((e as { status?: number }).status !== 404) setFailed(true);
        setLoading(false);
      },
    );
  }, []);
  useEffect(() => {
    if (reopen) reopenResults();
  }, [reopen, reopenResults]);

  const submit = async () => {
    if (q.background === null) return;
    setBusy(true);
    setFailed(false);
    try {
      setResult(
        await api.fitQuiz({
          ...q,
          background: q.background,
          languages: langs
            .split(',')
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean),
        }),
      );
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const key = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const canNext =
    key === 'degree' ? q.background !== null : key !== 'interests' || q.interests.length > 0;
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
      {children}
    </ScrollView>
  );

  if (loading)
    return scroll(
      <>
        <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
        <SkeletonRows count={5} />
      </>,
    );

  if (result) {
    const row = (r: FitRanking['top'][number]) => (
      <View
        key={r.slug}
        style={{
          gap: space.xs,
          paddingBottom: space.md,
          borderBottomWidth: 1,
          borderColor: c.hairline,
        }}
      >
        <Pressable
          testID={`fit-${r.slug}`}
          accessibilityRole="button"
          accessibilityLabel={`${r.name}. ${r.reason}`}
          onPress={() => router.push(`/optionals/${r.slug}`)}
          style={{ gap: space.xs }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="title" style={{ flex: 1 }}>
              {r.name}
            </Text>
            <MasteryDots n={fitDots(r.score)} />
          </View>
          <Text variant="caption" muted>
            {r.reason}
          </Text>
        </Pressable>
        <Button
          label="Why?"
          kind="text"
          align="start"
          testID={`why-${r.slug}`}
          onPress={() => setWhy(why === r.slug ? null : r.slug)}
        />
        {why === r.slug &&
          Object.entries(r.components)
            .sort(([a], [b]) => (result.weights[b] ?? 0) - (result.weights[a] ?? 0))
            .map(([k, v]) => (
              <Text key={k} variant="caption" muted>
                {`${componentLabel(k)} ${Math.round(v * 100)} × ${Math.round((result.weights[k] ?? 0) * 100)}%`}
              </Text>
            ))}
      </View>
    );
    return scroll(
      <>
        <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
        <Text variant="heading">Your best fits</Text>
        {result.top.map(row)}
        {result.surprising.length > 0 && (
          <>
            <Text variant="label" muted smallCaps>
              Surprising fits
            </Text>
            {result.surprising.map(row)}
          </>
        )}
        <Button
          label="Compare the top three"
          onPress={() =>
            router.push(
              `/optionals/compare?slugs=${result.top
                .slice(0, 3)
                .map((r) => r.slug)
                .join(',')}`,
            )
          }
        />
        <Button
          label="Retake"
          kind="text"
          onPress={() => {
            setResult(null);
            setWhy(null);
            setStep(0);
          }}
        />
      </>,
    );
  }

  const chips = (
    items: readonly string[],
    on: (v: string) => boolean,
    press: (v: string) => void,
    label: (v: string) => string = cap,
  ) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
      {items.map((i) => (
        <Chip key={i} label={label(i)} on={on(i)} onPress={() => press(i)} />
      ))}
    </View>
  );

  return scroll(
    <>
      <ProgressThread value={(step + 1) / STEPS.length} />
      <Button
        label="Back"
        kind="text"
        align="start"
        testID="quiz-back"
        onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
      />
      <Text variant="label" muted smallCaps>
        {`Question ${step + 1} of ${STEPS.length}`}
      </Text>
      <Text variant="heading">{HEADINGS[key]}</Text>
      <Text muted>{HINTS[key]}</Text>
      {key === 'degree' &&
        chips(
          BACKGROUNDS,
          (v) => q.background === v,
          (v) => setQ({ ...q, background: v as FitQuiz['background'] }),
        )}
      {key === 'interests' &&
        chips(
          INTERESTS,
          (v) => q.interests.includes(v),
          (v) => setQ({ ...q, interests: toggle(q.interests, v, 6) }),
        )}
      {key === 'reading' &&
        chips(
          READING,
          (v) => q.reading.includes(v as (typeof READING)[number]),
          (v) => setQ({ ...q, reading: toggle(q.reading, v as (typeof READING)[number], 4) }),
        )}
      {key === 'style' &&
        chips(
          STYLE,
          (v) => q.answerStyle.includes(v as (typeof STYLE)[number]),
          (v) => setQ({ ...q, answerStyle: toggle(q.answerStyle, v as (typeof STYLE)[number], 4) }),
        )}
      {key === 'hours' &&
        chips(
          HOURS.map(String),
          (v) => q.hours === Number(v),
          (v) => setQ({ ...q, hours: Number(v) }),
          (v) => `${v}h`,
        )}
      {key === 'language' && (
        <Field value={langs} onChangeText={setLangs} placeholder="e.g. hindi, english" />
      )}
      {key === 'risk' &&
        chips(
          RISK.map(([l]) => l),
          (v) => RISK.find(([l]) => l === v)?.[1] === q.risk,
          (v) => setQ({ ...q, risk: RISK.find(([l]) => l === v)![1] }),
          (v) => v,
        )}
      {failed && <LoadError onRetry={() => void submit()} />}
      <Button
        label={last ? 'See my fits' : 'Next'}
        testID="quiz-next"
        disabled={!canNext}
        busy={busy}
        onPress={() => (last ? void submit() : setStep(step + 1))}
      />
    </>,
  );
}
