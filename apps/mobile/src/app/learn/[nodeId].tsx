import type { LearnSession } from '@koach/shared';
import { space } from '@koach/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Learn session (UI_SPEC §10.5, PED-01): how it's asked → where to read → recall → done.

type Step = 'pyqs' | 'read' | 'recall' | 'done';

export default function Learn() {
  const { c } = useTheme();
  const { nodeId, task } = useLocalSearchParams<{ nodeId: string; task?: string }>();
  const [session, setSession] = useState<LearnSession | null>(null);
  const [step, setStep] = useState<Step>('pyqs');
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [ri, setRi] = useState(0);
  const [shown, setShown] = useState(false);
  const [graded, setGraded] = useState<{ q: string; a: string; got: boolean }[]>([]);
  const [results, setResults] = useState<
    { pyqId: string; correct: boolean; answer: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.learn(nodeId).then(
      (s) => {
        setSession(s);
        if (!s.pyqs.length) setStep('read');
      },
      () => setError("Couldn't reach the library. Try again."),
    );
  }, [nodeId]);

  const finish = async (recall: typeof graded) => {
    const out = await api.learnResult(nodeId, {
      recall,
      answers: Object.entries(chosen).map(([pyqId, c2]) => ({ pyqId, chosen: c2 })),
      ...(task ? { taskId: task } : {}),
    });
    setResults(out.results);
    setStep('done');
  };

  const grade = (got: boolean) => {
    const item = session?.recall[ri];
    if (!item) return;
    const next = [...graded, { ...item, got }];
    setGraded(next);
    setShown(false);
    if (ri + 1 >= (session?.recall.length ?? 0)) void finish(next);
    else setRi(ri + 1);
  };

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.parchment, padding: space.lg }}>
        <Text muted>{error ?? 'Opening the chapter…'}</Text>
      </View>
    );
  }
  const item = session.recall[ri];
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
      <Button label="Back" kind="text" onPress={() => router.back()} />
      <Text variant="label" muted smallCaps>
        {session.goal}
      </Text>
      <Text variant="heading">{session.node.title}</Text>

      {step === 'pyqs' && (
        <>
          <Text muted>This is how it’s asked. Try them before you read.</Text>
          {session.pyqs.map((p) => (
            <PaperCard key={p.id} style={{ gap: space.sm }}>
              <Text variant="caption" muted>
                {p.exam === 'prelims' ? 'Prelims' : 'Mains'} {p.year}
                {p.marks ? ` · ${p.marks} marks` : ''}
              </Text>
              <Text>{p.text}</Text>
              {p.options?.map((o) => (
                <Chip
                  key={o.key}
                  label={`(${o.key}) ${o.text}`}
                  on={chosen[p.id] === o.key}
                  onPress={() => setChosen({ ...chosen, [p.id]: o.key })}
                />
              ))}
            </PaperCard>
          ))}
          <Button label="Where to read" onPress={() => setStep('read')} />
        </>
      )}

      {step === 'read' && (
        <>
          {session.source ? (
            <PaperCard style={{ gap: space.sm }}>
              <Text variant="label" muted smallCaps>
                Read
              </Text>
              <Text>
                {session.source.label} · {session.source.chapter}
              </Text>
              <Text variant="caption" muted>
                {session.source.reason}
              </Text>
            </PaperCard>
          ) : (
            <Text muted>Read this topic from your standard source.</Text>
          )}
          <Text muted>About {session.node.estMinutes} minutes. Come back for a short recall.</Text>
          <Button
            label={session.recall.length ? 'I’ve read it' : 'Finish'}
            onPress={() => (session.recall.length ? setStep('recall') : void finish([]))}
          />
        </>
      )}

      {step === 'recall' && item && (
        <>
          <Text variant="caption" muted>
            Recall {ri + 1} of {session.recall.length}
          </Text>
          <PaperCard style={{ gap: space.md }}>
            <Text>{item.q}</Text>
            {shown && <Text muted>{item.a}</Text>}
          </PaperCard>
          {!shown ? (
            <Button label="Show answer" onPress={() => setShown(true)} />
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Got it" onPress={() => grade(true)} />
              <Button label="Missed" kind="secondary" onPress={() => grade(false)} />
            </View>
          )}
        </>
      )}

      {step === 'done' && (
        <>
          <Text variant="heading">Done.</Text>
          {results.map((r) => (
            <Text key={r.pyqId} variant="caption" muted>
              {r.pyqId.slice(-4)}: {r.correct ? 'correct' : `answer (${r.answer ?? '?'})`}
            </Text>
          ))}
          {results.some((r) => !r.correct) && (
            <Text variant="caption" muted>
              Wrong answers went to your mistakes notebook.
            </Text>
          )}
          {graded.some((g) => !g.got) && (
            <Text variant="caption" muted>
              Missed recalls will come back in revision.
            </Text>
          )}
          <Button label="Back to today" onPress={() => router.replace('/today')} />
        </>
      )}
    </ScrollView>
  );
}
