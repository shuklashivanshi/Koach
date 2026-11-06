import type { CueFormatName, CueResponse, RecallGrade } from '@koach/shared';
import { space } from '@koach/ui';
import { createAudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { cacheAudio } from '@/files';
import { Field } from '@/lpt/games';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Make it stick (UI_SPEC §10.8, CUE-01..08): opens on the learner's strongest pattern; switch
// between See / Hear / Write / Do / Why; rate 👍/👎.

const GROUP_LABEL: Record<string, string> = {
  visual: 'See',
  auditory: 'Hear',
  readwrite: 'Write',
  kinesthetic: 'Do',
  everyone: 'Why',
};
const FORMAT_LABEL: Record<CueFormatName, string> = {
  palace: 'Memory palace',
  mindmap: 'Mind-map',
  timeline: 'Timeline',
  spoken: 'Spoken sheet',
  chant: 'Chant',
  mnemonic: 'Mnemonic',
  cuesheet: 'Cue sheet',
  cloze: 'Cloze',
  blurt: 'Write from memory',
  sequence: 'Sequence',
  flowchart: 'Flowchart',
  why: 'First principles',
};

type Content = Record<string, unknown>;
const list = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

function SequenceDrill({ steps }: { steps: string[] }) {
  const [shuffled] = useState(() => [...steps].sort(() => Math.random() - 0.5));
  const [order, setOrder] = useState<string[]>([]);
  const done = order.length === steps.length;
  const correct = done && order.every((s, i) => s === steps[i]);
  return (
    <View style={{ gap: space.sm }}>
      <Text muted>Tap the steps in order.</Text>
      {order.map((s, i) => (
        <Text key={s} variant="caption">
          {i + 1}. {s}
        </Text>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {shuffled
          .filter((s) => !order.includes(s))
          .map((s) => (
            <Chip key={s} label={s} on={false} onPress={() => setOrder([...order, s])} />
          ))}
      </View>
      {done && <Text>{correct ? 'In order.' : `Correct order: ${steps.join(' → ')}`}</Text>}
      {order.length > 0 && <Button label="Reset" kind="text" onPress={() => setOrder([])} />}
    </View>
  );
}

function CueBody({
  format,
  content,
  cueId,
}: {
  format: CueFormatName;
  content: Content;
  cueId: string;
}) {
  const [shown, setShown] = useState(false);
  const [text, setText] = useState('');
  const [grade, setGrade] = useState<RecallGrade | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const play = async () => {
    setBusy(true);
    try {
      const { audioBase64 } = await api.cueAudio(cueId);
      createAudioPlayer(await cacheAudio(`cue-${cueId}.mp3`, audioBase64)).play();
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => setGrade(await api.gradeCue(cueId, text));

  switch (format) {
    case 'palace':
      return (
        <View style={{ gap: space.sm }}>
          {list<{ locus: string; fact: string; image: string }>(content.placements).map((p) => (
            <View key={p.locus}>
              <Text variant="label" muted smallCaps>
                {p.locus}
              </Text>
              <Text>{p.image}</Text>
              <Text variant="caption" muted>
                {p.fact}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'mindmap':
      return (
        <View style={{ gap: space.sm }}>
          <Text variant="heading">{String(content.center)}</Text>
          {list<{ label: string; leaves: string[] }>(content.branches).map((b) => (
            <View key={b.label} style={{ paddingLeft: space.md }}>
              <Text>— {b.label}</Text>
              {b.leaves.map((l) => (
                <Text key={l} variant="caption" muted style={{ paddingLeft: space.md }}>
                  · {l}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case 'timeline':
      return (
        <View style={{ gap: space.xs }}>
          {list<{ when: string; what: string }>(content.events).map((e) => (
            <Text key={`${e.when}${e.what}`}>
              <Text variant="label">{e.when}</Text> {e.what}
            </Text>
          ))}
        </View>
      );
    case 'spoken':
    case 'chant':
    case 'mnemonic':
      return (
        <View style={{ gap: space.sm }}>
          {format === 'spoken' && <Text>{String(content.script)}</Text>}
          {format === 'chant' && list<string>(content.lines).map((l) => <Text key={l}>{l}</Text>)}
          {format === 'mnemonic' && (
            <>
              <Text variant="heading">{String(content.device)}</Text>
              {list<{ key: string; fact: string }>(content.mapping).map((m) => (
                <Text key={m.key + m.fact} variant="caption">
                  <Text variant="label">{m.key}</Text> {m.fact}
                </Text>
              ))}
            </>
          )}
          <Button label="Play" kind="secondary" busy={busy} onPress={() => void play()} />
        </View>
      );
    case 'cuesheet':
      return (
        <View style={{ gap: 2 }}>
          {list<string>(content.lines).map((l) => (
            <Text key={l}>{l}</Text>
          ))}
        </View>
      );
    case 'cloze':
      return (
        <View style={{ gap: space.sm }}>
          {list<{ text: string; answer: string }>(content.items).map((it) => (
            <Text key={it.text}>
              {it.text} {shown && <Text muted>({it.answer})</Text>}
            </Text>
          ))}
          <Button
            label={shown ? 'Hide answers' : 'Show answers'}
            kind="text"
            onPress={() => setShown(!shown)}
          />
          <Button
            label={added === null ? 'Add to revision' : `${added} cards added`}
            kind="secondary"
            disabled={added !== null}
            onPress={() => void api.clozeCards(cueId).then((r) => setAdded(r.added))}
          />
        </View>
      );
    case 'blurt':
    case 'why':
      return (
        <View style={{ gap: space.sm }}>
          <Text>{format === 'why' ? String(content.question) : String(content.prompt)}</Text>
          {format === 'why' && !shown && <Text muted>Try your own answer first.</Text>}
          <Field
            value={text}
            onChangeText={setText}
            placeholder={format === 'why' ? 'Your reasoning' : 'Everything you remember'}
            lines={5}
          />
          {format === 'why' && !shown && (
            <Button label="Show the steps" kind="text" onPress={() => setShown(true)} />
          )}
          {format === 'why' && shown && (
            <>
              {list<string>(content.steps).map((st, i) => (
                <Text key={st} variant="caption">
                  {i + 1}. {st}
                </Text>
              ))}
              <Text muted>{String(content.teachBack)}</Text>
            </>
          )}
          <Button
            label={format === 'why' ? 'Grade my explanation' : 'Check'}
            onPress={() => void submit()}
            disabled={!text.trim()}
          />
          {grade && (
            <PaperCard style={{ gap: space.xs }}>
              <Text>{Math.round(grade.score * 100)}% of the key points</Text>
              {grade.feedback ? (
                <Text variant="caption" muted>
                  {grade.feedback}
                </Text>
              ) : null}
            </PaperCard>
          )}
        </View>
      );
    case 'sequence':
      return <SequenceDrill steps={list<string>(content.steps)} />;
    case 'flowchart':
      return (
        <View style={{ gap: space.xs }}>
          {list<{ label: string; detail: string }>(content.steps).map((st, i, all) => (
            <View key={st.label}>
              <Text variant="label">{st.label}</Text>
              <Text variant="caption" muted>
                {st.detail}
              </Text>
              {i < all.length - 1 && <Text muted>↓</Text>}
            </View>
          ))}
        </View>
      );
  }
}

export default function MakeItStick() {
  const { c } = useTheme();
  const { nodeId, title } = useLocalSearchParams<{ nodeId: string; title?: string }>();
  const [res, setRes] = useState<CueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rated, setRated] = useState<boolean | null>(null);

  const load = useCallback(
    async (format?: CueFormatName) => {
      setLoading(true);
      setRated(null);
      try {
        setRes(await api.cue(nodeId, format));
      } finally {
        setLoading(false);
      }
    },
    [nodeId],
  );
  useEffect(() => void load(), [load]);

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
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="label" muted smallCaps>
        Make it stick
      </Text>
      {title && <Text variant="heading">{title}</Text>}
      {res && (
        <View style={{ gap: space.xs }}>
          {res.groups.map((g) => (
            <View
              key={g.pattern}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: space.xs,
                alignItems: 'center',
              }}
            >
              <Text variant="caption" muted style={{ width: 44 }}>
                {GROUP_LABEL[g.pattern]}
              </Text>
              {g.formats.map((f) => (
                <Chip
                  key={f}
                  label={FORMAT_LABEL[f]}
                  on={res.format === f}
                  onPress={() => void load(f)}
                />
              ))}
            </View>
          ))}
        </View>
      )}
      {loading && <Text muted>Writing your cue…</Text>}
      {!loading && res?.status === 'palace' && (
        <PaperCard style={{ gap: space.sm }}>
          <Text>Set up your memory palace once: a few rooms you know well, and spots in each.</Text>
          <Button label="Set up my palace" onPress={() => router.push('/palace')} />
        </PaperCard>
      )}
      {!loading && res?.status === 'failed' && (
        <Text muted>This one didn’t pass the accuracy check. Try another format.</Text>
      )}
      {!loading && res?.status === 'ready' && res.cue && (
        <PaperCard style={{ gap: space.md }}>
          <CueBody format={res.cue.format} content={res.cue.content} cueId={res.cue.id} />
          <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' }}>
            {([true, false] as const).map((up) => (
              <Pressable
                key={String(up)}
                accessibilityRole="button"
                accessibilityLabel={up ? 'Helpful' : 'Not helpful'}
                onPress={() => void api.rateCue(res.cue!.id, up).then(() => setRated(up))}
                style={{ padding: space.xs, opacity: rated === null || rated === up ? 1 : 0.4 }}
              >
                <Text>{up ? '👍' : '👎'}</Text>
              </Pressable>
            ))}
          </View>
        </PaperCard>
      )}
    </ScrollView>
  );
}
