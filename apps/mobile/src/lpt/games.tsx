import { radius, space } from '@koach/ui';
import { createAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { api } from '@/api/client';
import { cacheAudio } from '@/files';
import { canRecord, startRecording } from '@/speech';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';
import { IndiaMap, type Pin } from './IndiaMap';

// The four Learning Pattern Test games (UI_SPEC §10.3). Each reports raw answers; the API scores.

export function useCountdown(seconds: number, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (left <= 0) {
      end.current();
      return;
    }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return left;
}

function Timer({ left, total }: { left: number; total: number }) {
  const { c } = useTheme();
  return (
    <View style={{ height: 2, backgroundColor: c.hairline }}>
      <View style={{ height: 2, width: `${(left / total) * 100}%`, backgroundColor: c.leather }} />
    </View>
  );
}

export function Field(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  lines?: number;
}) {
  const { c } = useTheme();
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor={c.inkMuted}
      multiline={!!props.lines}
      numberOfLines={props.lines}
      style={{
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: radius.button,
        padding: space.sm,
        color: c.ink,
        backgroundColor: c.cream,
        minHeight: props.lines ? props.lines * 22 : undefined,
        textAlignVertical: 'top',
      }}
    />
  );
}

/** Text answer with an optional "Say it" mic (web: MediaRecorder → speech-to-text). */
export function SpokenField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [rec, setRec] = useState<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!rec) {
      try {
        setRec(await startRecording());
      } catch {
        /* mic blocked: typing still works */
      }
      return;
    }
    setBusy(true);
    try {
      const { base64, seconds } = await rec.stop();
      setRec(null);
      const { text } = await api.transcribe(base64, Math.max(0.5, seconds));
      onChange(value ? `${value} ${text}` : text);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: space.sm }}>
      <Field value={value} onChangeText={onChange} placeholder={placeholder} lines={3} />
      {canRecord && (
        <Button
          label={rec ? 'Stop' : 'Say it'}
          kind="secondary"
          busy={busy}
          onPress={() => void toggle()}
        />
      )}
    </View>
  );
}

// --- Map Pins (visual) ------------------------------------------------------------------------

export function MapPins({
  places,
  showSeconds = 20,
  onDone,
}: {
  places: Pin[];
  showSeconds?: number;
  onDone: (placed: Record<string, { lat: number; lon: number }>) => void;
}) {
  const [phase, setPhase] = useState<'study' | 'place'>(showSeconds ? 'study' : 'place');
  const left = useCountdown(phase === 'study' ? showSeconds : 0, () => setPhase('place'));
  const [placed, setPlaced] = useState<Record<string, { lat: number; lon: number }>>({});
  const [current, setCurrent] = useState(places[0]?.name ?? '');
  if (phase === 'study') {
    return (
      <View style={{ gap: space.md }}>
        <Timer left={left} total={showSeconds} />
        <Text muted>Remember where these are.</Text>
        <IndiaMap pins={places} />
      </View>
    );
  }
  const pins = Object.entries(placed).map(([name, p]) => ({ name, ...p }));
  return (
    <View style={{ gap: space.md }}>
      <Text muted>Tap a place, then tap the map.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {places.map((p) => (
          <Button
            key={p.name}
            label={p.name}
            // Fixed labels so the row never re-wraps and shifts the map under the learner's finger.
            kind={current === p.name ? 'primary' : placed[p.name] ? 'text' : 'secondary'}
            onPress={() => setCurrent(p.name)}
          />
        ))}
      </View>
      <IndiaMap
        pins={pins}
        onTap={(pos) => {
          if (!current) return;
          const next = { ...placed, [current]: pos };
          setPlaced(next);
          setCurrent(places.find((p) => !next[p.name])?.name ?? current);
        }}
      />
      <Button label="Done" onPress={() => onDone(placed)} />
    </View>
  );
}

// --- Pattern Grid (visual) --------------------------------------------------------------------

export function PatternGrid({
  sequences,
  onDone,
}: {
  sequences: number[][];
  onDone: (answers: number[][]) => void;
}) {
  const { c } = useTheme();
  const [round, setRound] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [mode, setMode] = useState<'show' | 'input'>('show');
  const [taps, setTaps] = useState<number[]>([]);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [misses, setMisses] = useState(0);
  const seq = sequences[round] ?? [];

  useEffect(() => {
    if (mode !== 'show') return;
    let i = 0;
    const t = setInterval(() => {
      if (i < seq.length) setLit(seq[i++] ?? null);
      else {
        clearInterval(t);
        setLit(null);
        setMode('input');
      }
    }, 600);
    return () => clearInterval(t);
  }, [mode, round, seq]);

  const tap = (cell: number) => {
    if (mode !== 'input') return;
    const next = [...taps, cell];
    setTaps(next);
    if (next.length < seq.length) return;
    const all = [...answers, next];
    const wrong = next.some((x, j) => x !== seq[j]);
    const missed = wrong ? misses + 1 : 0;
    // Stop after two misses in a row, or when every round is done.
    if (missed >= 2 || round + 1 >= sequences.length) {
      onDone(all);
      return;
    }
    setAnswers(all);
    setMisses(missed);
    setTaps([]);
    setRound(round + 1);
    setMode('show');
  };

  return (
    <View style={{ gap: space.md, alignItems: 'center' }}>
      <Text muted>
        {mode === 'show' ? 'Watch the cells.' : `Tap them in order · ${taps.length}/${seq.length}`}
      </Text>
      <View style={{ width: 250, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: 25 }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => tap(i)}
            accessibilityLabel={`cell ${i + 1}`}
            style={{
              width: 46,
              height: 46,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: c.hairline,
              backgroundColor: lit === i || taps.includes(i) ? c.leather : c.cream,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// --- Listen & Recall (auditory) ---------------------------------------------------------------

export function ListenRecall({
  form,
  lists,
  onDone,
}: {
  form: 'A' | 'B';
  lists: number[];
  onDone: (answers: string[]) => void;
}) {
  const [i, setI] = useState(0);
  const [played, setPlayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const play = async () => {
    setBusy(true);
    try {
      const { audioBase64 } = await api.lptAudio(form, i);
      createAudioPlayer(await cacheAudio(`lpt-${form}-${i}.mp3`, audioBase64)).play();
      setPlayed(true);
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    const all = [...answers, answer];
    if (i + 1 >= lists.length) return onDone(all);
    setAnswers(all);
    setAnswer('');
    setPlayed(false);
    setI(i + 1);
  };
  return (
    <View style={{ gap: space.md }}>
      <Text muted>
        List {i + 1} of {lists.length} · {lists[i]} items. It plays once.
      </Text>
      {!played ? (
        <Button label="Play" onPress={() => void play()} busy={busy} />
      ) : (
        <>
          <SpokenField
            value={answer}
            onChange={setAnswer}
            placeholder="Type or say what you heard"
          />
          <Button label="Next" onPress={next} />
        </>
      )}
    </View>
  );
}

// --- Read & Write Back (reading/writing) ------------------------------------------------------

export function ReadWriteBack({
  passage,
  onDone,
}: {
  passage: string;
  onDone: (text: string) => void;
}) {
  const [phase, setPhase] = useState<'read' | 'write'>('read');
  const left = useCountdown(phase === 'read' ? 60 : 0, () => setPhase('write'));
  const [text, setText] = useState('');
  if (phase === 'read') {
    return (
      <View style={{ gap: space.md }}>
        <Timer left={left} total={60} />
        <PaperCard>
          <Text>{passage}</Text>
        </PaperCard>
        <Button label="I'm ready" kind="text" onPress={() => setPhase('write')} />
      </View>
    );
  }
  return (
    <View style={{ gap: space.md }}>
      <Text muted>Write the key points you remember.</Text>
      <Field value={text} onChangeText={setText} placeholder="Key points" lines={8} />
      <Button label="Done" onPress={() => onDone(text)} />
    </View>
  );
}

// --- Arrange (kinesthetic) --------------------------------------------------------------------

export function Arrange({
  events,
  study = true,
  onDone,
}: {
  events: { label: string; year: number }[];
  study?: boolean;
  onDone: (order: string[]) => void;
}) {
  const { c } = useTheme();
  const [order, setOrder] = useState<string[]>([]);
  const [phase, setPhase] = useState<'sort' | 'recall'>(study ? 'sort' : 'recall');
  const [first, setFirst] = useState<string[]>([]);
  const year = new Map(events.map((e) => [e.label, e.year]));
  const showYear = (e: string) => (phase === 'sort' ? `${e} · ${year.get(e)}` : e);
  const remaining = events.map((e) => e.label).filter((e) => !order.includes(e));
  const done = () => {
    // Study pass: order them once while learning, then again from memory.
    if (phase === 'sort') {
      setFirst(order);
      setOrder([]);
      setPhase('recall');
      return;
    }
    onDone(order);
  };
  return (
    <View style={{ gap: space.md }}>
      <Text muted>
        {phase === 'sort'
          ? 'Put these in order, earliest first. Notice the years.'
          : 'Again, from memory: earliest to latest.'}
      </Text>
      {phase === 'recall' && first.length > 0 && (
        <Text variant="caption" muted>
          Cards reshuffled.
        </Text>
      )}
      <View style={{ gap: space.xs }}>
        {order.map((e, i) => (
          <PaperCard key={e} style={{ paddingVertical: space.sm }}>
            <Text>
              {i + 1}. {showYear(e)}
            </Text>
          </PaperCard>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {(phase === 'recall' ? [...remaining].reverse() : remaining).map((e) => (
          <Pressable
            key={e}
            onPress={() => setOrder([...order, e])}
            style={{
              padding: space.sm,
              borderRadius: radius.indexCard,
              borderWidth: 1,
              borderColor: c.hairline,
              backgroundColor: c.cream,
            }}
          >
            <Text variant="caption">{showYear(e)}</Text>
          </Pressable>
        ))}
      </View>
      {order.length > 0 && (
        <Button label="Undo" kind="text" onPress={() => setOrder(order.slice(0, -1))} />
      )}
      {remaining.length === 0 && <Button label="Done" onPress={done} />}
    </View>
  );
}
