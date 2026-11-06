import { space } from '@koach/ui';
import type { LptForm, LptProfile, LptSubmit } from '@koach/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import {
  Arrange,
  ListenRecall,
  MapPins,
  PatternGrid,
  ReadWriteBack,
  SpokenField,
  useCountdown,
  Field,
} from '@/lpt/games';
import { StrengthBars } from '@/lpt/StrengthBars';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Learning Pattern Test (UI_SPEC §10.3, LPT-01/02): four games in random order, then a delayed
// round at least 8 minutes after the first game. Scores are computed by the API.

type Game = 'visual' | 'auditory' | 'readwrite' | 'kinesthetic';
const TITLES: Record<Game, string> = {
  visual: 'Map Pins & Pattern Grid',
  auditory: 'Listen & Recall',
  readwrite: 'Read & Write Back',
  kinesthetic: 'Arrange',
};
const DELAY_MS = 8 * 60 * 1000;

function useHiddenMs() {
  const hidden = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let since = 0;
    const onChange = () => {
      if (document.hidden) since = Date.now();
      else if (since) hidden.current += Date.now() - since;
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

function Wait({ until, onReady }: { until: number; onReady: () => void }) {
  const left = useCountdown(Math.max(0, Math.ceil((until - Date.now()) / 1000)), onReady);
  return (
    <View style={{ gap: space.md }}>
      <Text variant="heading">A short pause</Text>
      <Text muted>
        The last round checks what stayed with you. Back in {Math.floor(left / 60)}:
        {String(left % 60).padStart(2, '0')}.
      </Text>
    </View>
  );
}

export default function LearningPatternTest() {
  const { c } = useTheme();
  const [form, setForm] = useState<LptForm | null>(null);
  const order = useMemo<Game[]>(
    () =>
      (['visual', 'auditory', 'readwrite', 'kinesthetic'] as Game[]).sort(
        () => Math.random() - 0.5,
      ),
    [],
  );
  const [step, setStep] = useState(-1); // -1 intro, 0..3 games, 4 wait, 5..8 delayed, 9 results
  const [visualPart, setVisualPart] = useState<'pins' | 'grid'>('pins');
  const firstDoneAt = useRef<number | null>(null);
  const hidden = useHiddenMs();
  const [now, setNow] = useState<Partial<LptSubmit['immediate']>>({});
  const [later, setLater] = useState<Partial<LptSubmit['delayed']>>({});
  const [listenLater, setListenLater] = useState('');
  const [readLater, setReadLater] = useState('');
  const [result, setResult] = useState<LptProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.lptForm().then(setForm, () => setError("Couldn't reach the library. Try again."));
  }, []);

  const finishGame = (patch: Partial<LptSubmit['immediate']>) => {
    setNow((p) => ({ ...p, ...patch }));
    firstDoneAt.current ??= Date.now();
    setStep((s) => s + 1);
  };

  const submit = async (delayed: LptSubmit['delayed']) => {
    if (!form) return;
    try {
      const res = await api.submitLpt({
        form: form.form,
        immediate: {
          mapPins: now.mapPins ?? {},
          grid: now.grid ?? [],
          listen: now.listen ?? [],
          readWrite: now.readWrite ?? '',
          arrange: now.arrange ?? [],
        },
        delayed,
        hiddenMs: Math.round(hidden.current),
        skipped: [],
      });
      setResult(res.profile);
      setStep(9);
    } catch {
      setError("Couldn't reach the library. Try again.");
    }
  };

  if (!form) {
    return (
      <View style={{ flex: 1, backgroundColor: c.parchment, padding: space.lg }}>
        <Text muted>{error ?? 'Setting out the games…'}</Text>
      </View>
    );
  }

  const game = order[step];
  const delayedPlaces = form.places.filter((p) => form.delayed.places.includes(p.name));
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
      {step === -1 && (
        <>
          <Text variant="heading">How you learn</Text>
          <Text>4 short games · 15 min</Text>
          <Text muted>No scores until the end. Keep this tab open.</Text>
          <Button label="Begin" onPress={() => setStep(0)} />
          <Button label="Later" kind="text" onPress={() => router.replace('/today')} />
        </>
      )}

      {game && step < 4 && (
        <Text variant="label" muted smallCaps>
          Game {step + 1} of 4 · {TITLES[game]}
        </Text>
      )}
      {game === 'visual' && step < 4 && visualPart === 'pins' && (
        <MapPins
          places={form.places}
          onDone={(mapPins) => {
            setNow((p) => ({ ...p, mapPins }));
            setVisualPart('grid');
          }}
        />
      )}
      {game === 'visual' && step < 4 && visualPart === 'grid' && (
        <PatternGrid sequences={form.grid} onDone={(grid) => finishGame({ grid })} />
      )}
      {game === 'auditory' && step < 4 && (
        <ListenRecall
          form={form.form}
          lists={form.listLengths}
          onDone={(listen) => finishGame({ listen })}
        />
      )}
      {game === 'readwrite' && step < 4 && (
        <ReadWriteBack passage={form.passage} onDone={(readWrite) => finishGame({ readWrite })} />
      )}
      {game === 'kinesthetic' && step < 4 && (
        <Arrange events={form.events} onDone={(arrange) => finishGame({ arrange })} />
      )}

      {step === 4 && (
        <Wait until={(firstDoneAt.current ?? Date.now()) + DELAY_MS} onReady={() => setStep(5)} />
      )}

      {step >= 5 && step <= 8 && (
        <Text variant="label" muted smallCaps>
          Last round · {step - 4} of 4
        </Text>
      )}
      {step === 5 && (
        <MapPins
          places={delayedPlaces}
          showSeconds={0}
          onDone={(mapPins) => {
            setLater((p) => ({ ...p, mapPins }));
            setStep(6);
          }}
        />
      )}
      {step === 6 && (
        <View style={{ gap: space.md }}>
          <Text muted>
            Earlier you heard a list of {form.listLengths[form.delayed.list]} items. What do you
            remember?
          </Text>
          <SpokenField
            value={listenLater}
            onChange={setListenLater}
            placeholder="Type or say the items"
          />
          <Button label="Next" onPress={() => setStep(7)} />
        </View>
      )}
      {step === 7 && (
        <View style={{ gap: space.md }}>
          <Text muted>What do you remember from the passage you read?</Text>
          <Field value={readLater} onChangeText={setReadLater} placeholder="Key points" lines={6} />
          <Button label="Next" onPress={() => setStep(8)} />
        </View>
      )}
      {step === 8 && (
        <Arrange
          events={form.events}
          study={false}
          onDone={(arrange) =>
            void submit({
              mapPins: later.mapPins ?? {},
              listen: listenLater,
              readWrite: readLater,
              arrange,
            })
          }
        />
      )}

      {step === 9 && result && (
        <>
          <Text variant="display">How you learn</Text>
          <StrengthBars scores={result.scores} />
          <Text>{result.line}</Text>
          {result.lowConfidence && (
            <Text variant="caption" muted>
              You stepped away during the games, so this is a rough read. Retake any time.
            </Text>
          )}
          <Button label="Continue" onPress={() => router.replace('/today')} />
        </>
      )}
      {error && <Text muted>{error}</Text>}
    </ScrollView>
  );
}
