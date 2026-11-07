import type { CoachExchange, StressReply } from '@koach/shared';
import { radius, space } from '@koach/ui';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/api/client';
import { Field } from '@/lpt/games';
import { deadlineOverline } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// The Decision Coach (OPT-03; UI_SPEC 10.11): a bottom sheet with short exchanges, suggestion
// chips, the deadline as an overline, and three stress tests on the optionals in view.

const GENERIC_ERROR = "Couldn't reach the library. Try again.";
const CHIPS = [
  { label: "I'm an engineer…", fill: "I'm an engineer. Which optional suits me?" },
  { label: 'Is it too long?', fill: 'Is it too long for the hours I have?' },
  { label: 'Is it scoring?', fill: 'Is it scoring, going by the official numbers?' },
];
const VERDICT_WORDS = { comfortable: 'Comfortable', tight: 'Tight', short: 'Short' } as const;
const MAX_HISTORY = 4;

type Exchange = { q: string; a: string; test: string | null; resting: boolean };
type Named = { slug: string; name: string; units: number };
type AnswerFlow = { unit: number; title: string; prompt: string; feedback: string | null };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
const asHistory = (h: CoachExchange[]) =>
  h.slice(-MAX_HISTORY).map((x) => ({ q: clip(x.q, 500), a: clip(x.a, 1200) }));

function SuggestionChip({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: space.md,
        paddingVertical: space.xs,
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: c.hairline,
      }}
    >
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

export function CoachSheet({
  visible,
  slugs,
  onClose,
}: {
  visible: boolean;
  slugs: string[];
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [deadline, setDeadline] = useState<{ date: string; daysLeft: number } | null>(null);
  const [q, setQ] = useState('');
  const [thread, setThread] = useState<Exchange[]>([]);
  const [history, setHistory] = useState<CoachExchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [named, setNamed] = useState<Named[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [stress, setStress] = useState<StressReply | null>(null);
  const [why, setWhy] = useState(false);
  const [flow, setFlow] = useState<AnswerFlow | null>(null);
  const [lines, setLines] = useState('');
  const [stressBusy, setStressBusy] = useState(false);
  const slugKey = slugs.join(',');
  const asked = useRef(0);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    api.decision().then(
      (d) => live && setDeadline({ date: d.deadline, daysLeft: d.daysLeft }),
      () => undefined,
    );
    const list = slugKey ? slugKey.split(',').slice(0, 3) : [];
    Promise.all(list.map((s) => api.optional(s))).then(
      (rows) => {
        if (!live) return;
        const next = rows.map((o) => ({ slug: o.slug, name: o.name, units: o.topics.length }));
        setNamed(next);
        setSelected((cur) =>
          cur && next.some((n) => n.slug === cur) ? cur : (next[0]?.slug ?? null),
        );
      },
      () => live && setNamed([]),
    );
    return () => {
      live = false;
    };
  }, [visible, slugKey]);

  const ask = async () => {
    const question = q.trim();
    if (question.length < 3) return;
    setBusy(true);
    setError(false);
    const ticket = ++asked.current;
    try {
      const r = await api.askCoach(question, slugs, asHistory(history));
      if (ticket !== asked.current) return;
      setThread((t) => [
        ...t,
        { q: question, a: r.answer, test: r.stressTest, resting: r.resting },
      ]);
      if (!r.resting) setHistory((h) => [...h, { q: question, a: r.answer }].slice(-MAX_HISTORY));
      if (r.deadline) setDeadline({ date: r.deadline.date, daysLeft: r.deadline.daysLeft });
      setQ('');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const remember = (question: string, answer: string) =>
    setHistory((h) =>
      [...h, { q: clip(question, 500), a: clip(answer, 1200) }].slice(-MAX_HISTORY),
    );

  const runStress = async (kind: 'hours' | 'regret') => {
    if (!selected) return;
    setStressBusy(true);
    setError(false);
    setFlow(null);
    setWhy(false);
    try {
      const r = await api.stress({ kind, slug: selected });
      setStress(r);
      remember(`Stress test: ${r.title}`, r.body);
    } catch {
      setError(true);
    } finally {
      setStressBusy(false);
    }
  };

  const startAnswer = async () => {
    const pick = named.find((n) => n.slug === selected);
    if (!pick) return;
    setStressBusy(true);
    setError(false);
    setStress(null);
    setLines('');
    const unit = pick.units > 0 ? Math.floor(Math.random() * pick.units) : 0;
    try {
      const r = await api.stress({ kind: 'answer', slug: pick.slug, unit });
      setFlow({ unit, title: r.title, prompt: r.body, feedback: null });
    } catch {
      setError(true);
    } finally {
      setStressBusy(false);
    }
  };

  const feedback = async () => {
    if (!flow || !selected) return;
    setStressBusy(true);
    setError(false);
    try {
      const r = await api.stress({ kind: 'answer', slug: selected, unit: flow.unit, text: lines });
      setFlow({ ...flow, feedback: r.body });
      remember(`Stress test: ${r.title}`, `${lines.trim()} Feedback: ${r.body}`);
    } catch {
      setError(true);
    } finally {
      setStressBusy(false);
    }
  };

  const pickOptional = (slug: string) => {
    setSelected(slug);
    setStress(null);
    setFlow(null);
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="coach-sheet">
      {deadline && (
        <Text variant="label" muted testID="coach-overline">
          {deadlineOverline(deadline.date, deadline.daysLeft)}
        </Text>
      )}
      <Text variant="heading">Decision coach</Text>
      {slugs.length === 0 && (
        <Text variant="caption" muted>
          Tick optionals to compare first, so answers use their numbers.
        </Text>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CHIPS.map((chip) => (
          <SuggestionChip key={chip.label} label={chip.label} onPress={() => setQ(chip.fill)} />
        ))}
      </View>

      {thread.map((t, i) => (
        <PaperCard key={i} style={{ gap: space.xs }}>
          <Text variant="caption" muted>
            {t.q}
          </Text>
          <Text muted={t.resting}>{t.a}</Text>
          {t.test && <Text variant="caption">{`Try this: ${t.test}`}</Text>}
        </PaperCard>
      ))}

      <Field value={q} onChangeText={setQ} placeholder="Ask in your own words" lines={2} />
      <Button
        label="Ask"
        busy={busy}
        disabled={q.trim().length < 3}
        onPress={() => void ask()}
        testID="coach-ask"
      />

      {named.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Text variant="label" muted smallCaps>
            Stress tests
          </Text>
          {named.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {named.map((n) => (
                <Pressable
                  key={n.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected: n.slug === selected }}
                  onPress={() => pickOptional(n.slug)}
                  hitSlop={{ top: 8, bottom: 8 }}
                  style={{
                    minHeight: 36,
                    justifyContent: 'center',
                    paddingHorizontal: space.md,
                    borderRadius: radius.chip,
                    borderWidth: 1,
                    borderColor: n.slug === selected ? c.leather : c.hairline,
                    backgroundColor: n.slug === selected ? c.linen : 'transparent',
                  }}
                >
                  <Text variant="caption">{n.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {named.length === 1 && (
            <Text variant="caption" muted>
              {`On ${named[0]?.name}`}
            </Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md }}>
            <Button
              label="Hours check"
              kind="text"
              disabled={stressBusy}
              onPress={() => void runStress('hours')}
            />
            <Button
              label="3-line answer"
              kind="text"
              disabled={stressBusy}
              onPress={() => void startAnswer()}
            />
            <Button
              label="Regret check"
              kind="text"
              disabled={stressBusy}
              onPress={() => void runStress('regret')}
            />
          </View>
        </View>
      )}

      {stress && (
        <PaperCard style={{ gap: space.xs }}>
          <Text variant="title">{stress.title}</Text>
          <Text>{stress.body}</Text>
          {stress.verdict && (
            <Text variant="label" testID="stress-verdict">
              {VERDICT_WORDS[stress.verdict]}
            </Text>
          )}
          {stress.facts.length > 0 && (
            <>
              <Button
                label="Why?"
                kind="text"
                align="start"
                testID="stress-why"
                onPress={() => setWhy(!why)}
              />
              {why &&
                stress.facts.map((f, i) => (
                  <Text key={i} variant="caption" muted>
                    {f}
                  </Text>
                ))}
            </>
          )}
        </PaperCard>
      )}

      {flow && (
        <PaperCard style={{ gap: space.sm }}>
          <Text variant="title">{flow.title}</Text>
          <Text>{flow.prompt}</Text>
          {flow.feedback === null ? (
            <>
              <Field
                value={lines}
                onChangeText={setLines}
                placeholder="Three lines, as you would write in the exam"
                lines={4}
              />
              <Button
                label="Get feedback"
                kind="secondary"
                busy={stressBusy}
                disabled={lines.trim().length < 10}
                onPress={() => void feedback()}
                testID="answer-feedback"
              />
            </>
          ) : (
            <Text testID="answer-feedback-text">{flow.feedback}</Text>
          )}
        </PaperCard>
      )}

      {error && <Text>{GENERIC_ERROR}</Text>}
      <Button label="Close" kind="text" onPress={onClose} testID="coach-close" />
    </Sheet>
  );
}
