import { radius, space } from '@koach/ui';
import type { DiagnosticOutcome, DiagnosticQuestions } from '@koach/shared';
import { router } from 'expo-router';
import {
  BookOpenText,
  Briefcase,
  CalendarBlank,
  CaretLeft,
  Check,
  Ear,
  Eye,
  HandPointing,
  Minus,
  Moon,
  Plus,
  SealCheck,
} from 'phosphor-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Onboarding (UI_SPEC §10.2, PROF-01/02): one question per step, ≤15 minutes in all.
// Patterns borrowed from popular kits and adapted to the Light Academia tokens:
// segmented progress (Untitled UI), radio cards (shadcn/Radix), round steppers (Mobbin
// number inputs), segmented control (iOS / shadcn toggle group), lettered quiz options.

type Level = 'new' | 'some' | 'strong';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LEVELS: { key: Level; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'some', label: 'Some' },
  { key: 'strong', label: 'Strong' },
];
const TOTAL_STEPS = 5;
const fmt = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

/** Segmented progress: one hairline segment per step, leather once reached. */
function Thread({ step, total }: { step: number; total: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={{ flexDirection: 'row', gap: space.xs, flex: 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < step ? c.leather : c.linen,
          }}
        />
      ))}
    </View>
  );
}

/** Overline + display title + supporting line + a small gilt ornament rule. */
function Header({ overline, title, lede }: { overline: string; title: string; lede?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm, paddingTop: space.md }}>
      <Text variant="label" muted smallCaps style={{ letterSpacing: 1.8 }}>
        {overline}
      </Text>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 28, height: 1, backgroundColor: c.gilt }} />
        <View
          style={{ width: 5, height: 5, backgroundColor: c.gilt, transform: [{ rotate: '45deg' }] }}
        />
      </View>
      {lede ? (
        <Text muted style={{ marginTop: space.xs }}>
          {lede}
        </Text>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" muted smallCaps style={{ letterSpacing: 1.4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: space.md,
        paddingVertical: space.xs,
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: on ? c.leather : c.hairline,
        backgroundColor: on ? c.linen : 'transparent',
      }}
    >
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

/** Radio card: icon tile, title, subtitle, and a radio dot. */
function RadioCard({
  title,
  subtitle,
  icon,
  on,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  on: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.card,
        borderWidth: on ? 1.5 : 1,
        borderColor: on ? c.leather : c.hairline,
        backgroundColor: on ? c.cream : 'transparent',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.button,
          backgroundColor: c.linen,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" muted>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: on ? c.leather : c.hairline,
          backgroundColor: on ? c.leather : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <Check size={13} weight="bold" color={c.onLeather} />}
      </View>
    </Pressable>
  );
}

/** Round icon button used by the hour steppers. */
function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: c.hairline,
        backgroundColor: pressed ? c.linen : c.cream,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {children}
    </Pressable>
  );
}

/** Segmented control: a linen track with a raised cream thumb on the active option. */
function Segmented({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: radius.button,
        backgroundColor: c.linen,
      }}
    >
      {LEVELS.map((l) => {
        const on = value === l.key;
        return (
          <Pressable
            key={l.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(l.key)}
            style={{
              flex: 1,
              minHeight: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.button - 3,
              backgroundColor: on ? c.cream : 'transparent',
              borderWidth: on ? 1 : 0,
              borderColor: c.hairline,
            }}
          >
            <Text variant="label" muted={!on} style={{ letterSpacing: 0.3 }}>
              {l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Quiz option: lettered badge in Cormorant, leather border when chosen. */
function QuizOption({
  letter,
  text,
  on,
  onPress,
}: {
  letter: string;
  text: string;
  on: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.button,
        borderWidth: on ? 1.5 : 1,
        borderColor: on ? c.leather : c.hairline,
        backgroundColor: on ? c.linen : c.cream,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? c.leather : 'transparent',
          borderWidth: 1,
          borderColor: on ? c.leather : c.hairline,
        }}
      >
        <Text
          variant="heading"
          style={{ fontSize: 20, lineHeight: 24, color: on ? c.onLeather : c.inkMuted }}
        >
          {letter.toUpperCase()}
        </Text>
      </View>
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>{text}</Text>
    </Pressable>
  );
}

function TimeField({
  label,
  icon,
  value,
  onChange,
  valid,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (s: string) => void;
  valid: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        {icon}
        <Text variant="label" muted>
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        placeholder="HH:MM-HH:MM"
        placeholderTextColor={c.inkMuted}
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: valid ? c.hairline : c.rosewood,
          borderRadius: radius.button,
          paddingHorizontal: space.md,
          height: 48,
          fontFamily: 'Literata_500Medium',
          fontSize: 15,
          color: c.ink,
          backgroundColor: c.cream,
        }}
      />
    </View>
  );
}

const GAMES = [
  { Icon: Eye, label: 'Visual', hint: 'Maps and patterns' },
  { Icon: Ear, label: 'Auditory', hint: 'Listen and recall' },
  { Icon: BookOpenText, label: 'Reading and writing', hint: 'Read, then write back' },
  { Icon: HandPointing, label: 'Kinesthetic', hint: 'Arrange and trace' },
];

export default function Onboarding() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState('cse-2027');
  const [minutes, setMinutes] = useState([150, 150, 150, 150, 150, 300, 300]);
  const [work, setWork] = useState('09:30-18:30');
  const [quiet, setQuiet] = useState('23:00-06:30');
  const [subjects, setSubjects] = useState<{ id: string; title: string }[]>([]);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [questions, setQuestions] = useState<DiagnosticQuestions['questions']>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<DiagnosticOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.subjects().then((r) => setSubjects(r.subjects));
  }, []);

  const hoursOk = (v: string) => /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(v);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError("Couldn't reach the library. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = () =>
    run(async () => {
      await api.saveProfile({
        target,
        weekdayMinutes: minutes,
        workHours: hoursOk(work) ? work : null,
        quietHours: hoursOk(quiet) ? quiet : null,
        selfAssessment: levels,
      });
      setQuestions((await api.diagnostic()).questions);
      setStep(3);
    });

  const finishCheck = (skip: boolean) =>
    run(async () => {
      const list = skip
        ? []
        : questions.map((q) => ({ pyqId: q.id, chosen: answers[q.id] ?? null }));
      setOutcome(await api.submitDiagnostic({ answers: list }));
      setStep(4);
    });

  const q = questions[qi];
  const step_ = (n: number) => `Step ${n} of ${TOTAL_STEPS}`;

  // Footer: the single primary action for the step, pinned above the home indicator.
  let footer: ReactNode = null;
  if (step === 0) footer = <Button label="Continue" onPress={() => setStep(1)} />;
  if (step === 1) footer = <Button label="Continue" onPress={() => setStep(2)} />;
  if (step === 2)
    footer = <Button label="Continue" onPress={() => void saveProfile()} busy={busy} />;
  if (step === 3) {
    footer = (
      <>
        {q && qi < questions.length - 1 && (
          <Button label="Next question" onPress={() => setQi(qi + 1)} disabled={!answers[q.id]} />
        )}
        {q && qi === questions.length - 1 && (
          <Button label="Finish" onPress={() => void finishCheck(false)} busy={busy} />
        )}
        <Button label="Skip for now" kind="text" onPress={() => void finishCheck(true)} />
      </>
    );
  }
  if (step === 4) {
    footer = (
      <>
        <Button label="Begin the games" onPress={() => router.replace('/lpt')} />
        <Button label="Later" kind="text" onPress={() => router.replace('/today')} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.parchment }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.lg,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          minHeight: 44,
        }}
      >
        {step > 0 && step < 4 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => setStep(step - 1)}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.linen,
            }}
          >
            <CaretLeft size={18} weight="light" color={c.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Thread step={step + 1} total={TOTAL_STEPS} />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xl,
          gap: space.xl,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Animated.View
          key={`${step}-${qi}`}
          entering={FadeInDown.duration(240)}
          style={{ gap: space.xl }}
        >
          {step === 0 && (
            <>
              <Header
                overline={step_(1)}
                title="Your attempt"
                lede="Pick the exam you are preparing for. Your plan counts back from its Prelims date."
              />
              <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
                <RadioCard
                  title="CSE 2027"
                  subtitle="Prelims · 23 May"
                  icon={<CalendarBlank size={22} weight="light" color={c.leather} />}
                  on={target === 'cse-2027'}
                  onPress={() => setTarget('cse-2027')}
                />
                <RadioCard
                  title="CSE 2028"
                  subtitle="A longer runway, a gentler pace"
                  icon={<CalendarBlank size={22} weight="light" color={c.leather} />}
                  on={target === 'cse-2028'}
                  onPress={() => setTarget('cse-2028')}
                />
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Header
                overline={step_(2)}
                title="Your hours"
                lede="How long can you realistically study each day? You can change this any time."
              />
              <PaperCard style={{ paddingVertical: space.sm, paddingHorizontal: space.md }}>
                {DAYS.map((d, i) => {
                  const m = minutes[i] ?? 0;
                  return (
                    <View
                      key={d}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        paddingVertical: space.sm,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: c.hairline,
                      }}
                    >
                      <Text variant="title" style={{ width: 44 }}>
                        {d}
                      </Text>
                      <View
                        style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.linen }}
                      >
                        <View
                          style={{
                            height: 4,
                            borderRadius: 2,
                            width: `${(m / 960) * 100}%`,
                            backgroundColor: c.leather,
                          }}
                        />
                      </View>
                      <RoundButton
                        label={`Less time on ${d}`}
                        onPress={() =>
                          setMinutes(minutes.map((x, j) => (j === i ? Math.max(0, x - 30) : x)))
                        }
                      >
                        <Minus size={14} weight="light" color={c.ink} />
                      </RoundButton>
                      <Text
                        variant="label"
                        style={{
                          width: 56,
                          textAlign: 'center',
                          fontSize: 14,
                          fontVariant: ['tabular-nums', 'lining-nums'],
                        }}
                      >
                        {fmt(m)}
                      </Text>
                      <RoundButton
                        label={`More time on ${d}`}
                        onPress={() =>
                          setMinutes(minutes.map((x, j) => (j === i ? Math.min(960, x + 30) : x)))
                        }
                      >
                        <Plus size={14} weight="light" color={c.ink} />
                      </RoundButton>
                    </View>
                  );
                })}
              </PaperCard>
              <Button
                label="Copy Monday to weekdays"
                kind="text"
                onPress={() => setMinutes(minutes.map((m, j) => (j < 5 ? (minutes[0] ?? m) : m)))}
              />
              <Section title="Your day">
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <TimeField
                    label="Work hours"
                    icon={<Briefcase size={14} weight="light" color={c.inkMuted} />}
                    value={work}
                    onChange={setWork}
                    valid={hoursOk(work)}
                  />
                  <TimeField
                    label="Quiet hours"
                    icon={<Moon size={14} weight="light" color={c.inkMuted} />}
                    value={quiet}
                    onChange={setQuiet}
                    valid={hoursOk(quiet)}
                  />
                </View>
                <Text variant="caption" muted>
                  Written as HH:MM-HH:MM. Koach keeps study out of your quiet hours.
                </Text>
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              <Header
                overline={step_(3)}
                title="Where you stand"
                lede="An honest guess is enough. It sets where your first weeks begin."
              />
              <View style={{ gap: space.md }}>
                {subjects.map((s) => (
                  <PaperCard key={s.id} style={{ gap: space.md, padding: space.md }}>
                    <Text variant="title">{s.title}</Text>
                    <Segmented
                      value={levels[s.id] ?? 'new'}
                      onChange={(l) => setLevels({ ...levels, [s.id]: l })}
                    />
                  </PaperCard>
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Header
                overline={`A short check · ${
                  questions.length ? `${qi + 1} of ${questions.length}` : 'none ready'
                }`}
                title="Warm up"
                lede="Real Prelims questions. Guess freely, nothing here is graded against you."
              />
              {q ? (
                <PaperCard style={{ gap: space.md }}>
                  <Text variant="label" muted smallCaps style={{ letterSpacing: 1.4 }}>
                    Prelims {q.year}
                  </Text>
                  <Text variant="title" style={{ fontSize: 18, lineHeight: 26 }}>
                    {q.text}
                  </Text>
                  <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
                    {q.options.map((o) => (
                      <QuizOption
                        key={o.key}
                        letter={o.key}
                        text={o.text}
                        on={answers[q.id] === o.key}
                        onPress={() => setAnswers({ ...answers, [q.id]: o.key })}
                      />
                    ))}
                  </View>
                </PaperCard>
              ) : (
                <PaperCard>
                  <Text muted>
                    The question bank is still being prepared. You can skip for now.
                  </Text>
                </PaperCard>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <View style={{ alignItems: 'flex-start', gap: space.md }}>
                <SealCheck size={44} weight="light" color={c.gilt} />
                <Header
                  overline={step_(5)}
                  title="How you learn"
                  lede={
                    outcome && outcome.total > 0
                      ? `${outcome.score} of ${outcome.total} correct. Your plan starts from here.`
                      : 'Your plan starts from here.'
                  }
                />
              </View>
              <PaperCard style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
                  <Text variant="numeral">4</Text>
                  <Text variant="label" muted smallCaps style={{ letterSpacing: 1.4 }}>
                    short games · 15 min
                  </Text>
                </View>
                {GAMES.map(({ Icon, label, hint }, i) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingTop: space.md,
                      borderTopWidth: 1,
                      borderTopColor: c.hairline,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: c.linen,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} weight="light" color={c.leather} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="title" style={{ fontSize: 16 }}>
                        {label}
                      </Text>
                      <Text variant="caption" muted>
                        {hint}
                      </Text>
                    </View>
                    <Text variant="heading" style={{ fontSize: 20, color: c.gilt }}>
                      {i + 1}
                    </Text>
                  </View>
                ))}
              </PaperCard>
              <Text variant="caption" muted>
                They show which ways of learning stick best for you.
              </Text>
            </>
          )}
          {error && (
            <Text variant="caption" style={{ color: c.rosewood }}>
              {error}
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      {footer && (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: Math.max(insets.bottom, space.md),
            gap: space.xs,
            borderTopWidth: 1,
            borderTopColor: c.hairline,
            backgroundColor: c.parchment,
            alignItems: 'center',
          }}
        >
          <View style={{ width: '100%', maxWidth: 560, gap: space.xs }}>{footer}</View>
        </View>
      )}
    </View>
  );
}
