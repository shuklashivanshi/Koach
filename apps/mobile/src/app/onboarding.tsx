import { radius, space } from '@koach/ui';
import type { DiagnosticOutcome, DiagnosticQuestions } from '@koach/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { api } from '@/api/client';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Onboarding (UI_SPEC §10.2, PROF-01/02): one question per step, ≤15 minutes in all.

type Level = 'new' | 'some' | 'strong';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fmt = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

function Thread({ step, total }: { step: number; total: number }) {
  const { c } = useTheme();
  return (
    <View style={{ height: 2, backgroundColor: c.hairline, borderRadius: 1 }}>
      <View style={{ height: 2, width: `${(step / total) * 100}%`, backgroundColor: c.leather }} />
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

export default function Onboarding() {
  const { c } = useTheme();
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
      <Thread step={step + 1} total={5} />
      {step > 0 && step < 4 && (
        <Button label="Back" kind="text" align="start" onPress={() => setStep(step - 1)} />
      )}

      {step === 0 && (
        <>
          <Text variant="heading">Your attempt</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip
              label="CSE 2027 · Prelims 23 May"
              on={target === 'cse-2027'}
              onPress={() => setTarget('cse-2027')}
            />
            <Chip
              label="CSE 2028"
              on={target === 'cse-2028'}
              onPress={() => setTarget('cse-2028')}
            />
          </View>
          <Button label="Next" onPress={() => setStep(1)} />
        </>
      )}

      {step === 1 && (
        <>
          <Text variant="heading">Your hours</Text>
          {DAYS.map((d, i) => (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Text style={{ width: 48 }}>{d}</Text>
              <Button
                label="−"
                kind="secondary"
                onPress={() =>
                  setMinutes(minutes.map((m, j) => (j === i ? Math.max(0, m - 30) : m)))
                }
              />
              <Text style={{ width: 80, textAlign: 'center' }}>{fmt(minutes[i] ?? 0)}</Text>
              <Button
                label="+"
                kind="secondary"
                onPress={() =>
                  setMinutes(minutes.map((m, j) => (j === i ? Math.min(960, m + 30) : m)))
                }
              />
            </View>
          ))}
          <Button
            label="Copy Monday to weekdays"
            kind="text"
            onPress={() => setMinutes(minutes.map((m, j) => (j < 5 ? (minutes[0] ?? m) : m)))}
          />
          <Text variant="caption" muted>
            Work hours · quiet hours (HH:MM-HH:MM)
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {[
              [work, setWork],
              [quiet, setQuiet],
            ].map(([v, set], i) => (
              <TextInput
                key={i}
                value={v as string}
                onChangeText={set as (s: string) => void}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: hoursOk(v as string) ? c.hairline : c.rosewood,
                  borderRadius: radius.button,
                  padding: space.sm,
                  color: c.ink,
                  backgroundColor: c.cream,
                }}
              />
            ))}
          </View>
          <Button label="Next" onPress={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <Text variant="heading">Where you stand</Text>
          {subjects.map((s) => (
            <View key={s.id} style={{ gap: space.xs }}>
              <Text>{s.title}</Text>
              <View style={{ flexDirection: 'row', gap: space.xs }}>
                {(['new', 'some', 'strong'] as const).map((l) => (
                  <Chip
                    key={l}
                    label={l[0]!.toUpperCase() + l.slice(1)}
                    on={(levels[s.id] ?? 'new') === l}
                    onPress={() => setLevels({ ...levels, [s.id]: l })}
                  />
                ))}
              </View>
            </View>
          ))}
          <Button label="Next" onPress={() => void saveProfile()} busy={busy} />
        </>
      )}

      {step === 3 && (
        <>
          <Text variant="label" muted smallCaps>
            A short check · {questions.length ? `${qi + 1} of ${questions.length}` : 'none ready'}
          </Text>
          {q ? (
            <PaperCard style={{ gap: space.md }}>
              <Text variant="caption" muted>
                Prelims {q.year}
              </Text>
              <Text>{q.text}</Text>
              {q.options.map((o) => (
                <Chip
                  key={o.key}
                  label={`(${o.key}) ${o.text}`}
                  on={answers[q.id] === o.key}
                  onPress={() => setAnswers({ ...answers, [q.id]: o.key })}
                />
              ))}
            </PaperCard>
          ) : (
            <Text muted>The question bank is still being prepared. You can skip for now.</Text>
          )}
          {q && qi < questions.length - 1 && (
            <Button label="Next question" onPress={() => setQi(qi + 1)} disabled={!answers[q.id]} />
          )}
          {q && qi === questions.length - 1 && (
            <Button label="Finish" onPress={() => void finishCheck(false)} busy={busy} />
          )}
          <Button label="Skip" kind="text" onPress={() => void finishCheck(true)} />
        </>
      )}

      {step === 4 && (
        <>
          <Text variant="heading">How you learn</Text>
          {outcome && outcome.total > 0 && (
            <Text muted>
              {outcome.score} of {outcome.total} correct. Your plan starts from here.
            </Text>
          )}
          <Text>4 short games · 15 min</Text>
          <Text muted>They show which ways of learning stick best for you.</Text>
          <Button label="Begin" onPress={() => router.replace('/lpt')} />
          <Button label="Later" kind="text" onPress={() => router.replace('/today')} />
        </>
      )}
      {error && <Text muted>{error}</Text>}
    </ScrollView>
  );
}
