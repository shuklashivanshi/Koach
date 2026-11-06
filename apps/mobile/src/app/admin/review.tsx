import { radius, space } from '@koach/ui';
import type { ReviewSample, ReviewSummary } from '@koach/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

type Item = ReviewSample['items'][number];
type Kind = 'pyq' | 'source';

const QTYPES = [
  'statement',
  'how_many',
  'match',
  'assertion_reason',
  'direct',
  'descriptive',
] as const;
const STYPES = ['static', 'partial', 'current_affairs'] as const;

/** Reviewer tool (KB-07): approve or correct AI-suggested tags and source mappings. Web only. */
export default function AdminReview() {
  const { c } = useTheme();
  const [kind, setKind] = useState<Kind>('pyq');
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');

  const load = useCallback(async (k: Kind) => {
    setState('loading');
    try {
      const [sample, sum] = await Promise.all([api.reviewSample(k, 10), api.reviewSummary()]);
      setItems(sample.items);
      setSummary(sum);
      setState('ready');
    } catch (err) {
      setState(err instanceof ApiError && err.status === 403 ? 'forbidden' : 'error');
    }
  }, []);
  useEffect(() => void load(kind), [kind, load]);

  const done = async () => {
    setSummary(await api.reviewSummary());
  };

  const tally = summary?.[kind];
  return (
    <ScrollView
      style={{ backgroundColor: c.parchment }}
      contentContainerStyle={{
        padding: space.lg,
        gap: space.lg,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Review</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          label="PYQ tags"
          kind={kind === 'pyq' ? 'primary' : 'secondary'}
          onPress={() => setKind('pyq')}
        />
        <Button
          label="Sources"
          kind={kind === 'source' ? 'primary' : 'secondary'}
          onPress={() => setKind('source')}
        />
      </View>
      {tally && (
        <Text muted testID="tally">
          {tally.approved} approved · {tally.corrected} corrected · {tally.suggested} to review
          {tally.accuracy !== null ? ` · accuracy ${Math.round(tally.accuracy * 100)}%` : ''}
        </Text>
      )}
      {state === 'forbidden' && <Text>This page is for reviewers only.</Text>}
      {state === 'error' && <Text muted>Couldn&apos;t load. Try again.</Text>}
      {state === 'ready' && !items.length && <Text muted>Nothing left to review here.</Text>}
      {items.map((item) =>
        item.type === 'pyq' ? (
          <PyqCard key={item.id} item={item} onDone={done} />
        ) : (
          <SourceCard key={item.id} item={item} onDone={done} />
        ),
      )}
      {state === 'ready' && items.length > 0 && (
        <Button label="Next batch" kind="secondary" onPress={() => void load(kind)} />
      )}
    </ScrollView>
  );
}

function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          accessibilityRole="button"
          style={{
            paddingHorizontal: space.sm,
            paddingVertical: space.xs,
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: o === value ? c.leather : c.hairline,
            backgroundColor: o === value ? c.linen : 'transparent',
          }}
        >
          <Text variant="caption">{o.replace(/_/g, ' ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field(props: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const { c } = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={c.inkMuted}
      style={{
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: radius.button,
        padding: space.sm,
        color: c.ink,
        backgroundColor: c.cream,
      }}
    />
  );
}

function Status({ status }: { status: 'open' | 'approved' | 'corrected' }) {
  if (status === 'open') return null;
  return (
    <Text variant="caption" muted>
      {status === 'approved' ? 'Approved' : 'Corrected'}
    </Text>
  );
}

function PyqCard({
  item,
  onDone,
}: {
  item: Extract<Item, { type: 'pyq' }>;
  onDone: () => Promise<void>;
}) {
  const [status, setStatus] = useState<'open' | 'approved' | 'corrected'>('open');
  const [editing, setEditing] = useState(false);
  const [nodes, setNodes] = useState(item.nodes.map((n) => n.id).join(', '));
  const [qType, setQType] = useState((item.questionType ?? 'direct') as (typeof QTYPES)[number]);
  const [sType, setSType] = useState((item.sourceType ?? 'static') as (typeof STYPES)[number]);
  const [error, setError] = useState<string | null>(null);

  const decide = async (correct: boolean) => {
    setError(null);
    try {
      if (correct) {
        const ids = nodes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        await api.reviewPyq(item.id, {
          action: 'correct',
          nodes: ids.map((id, i) => ({ id, primary: i === 0 })),
          questionType: qType,
          sourceType: sType,
          directive: item.directive,
        });
      } else {
        await api.reviewPyq(item.id, { action: 'approve' });
      }
      setStatus(correct ? 'corrected' : 'approved');
      setEditing(false);
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    }
  };

  return (
    <PaperCard style={{ gap: space.sm }}>
      <Text variant="caption" muted>
        {item.exam} {item.year} · {item.id}
      </Text>
      <Text>{item.text}</Text>
      {item.options?.map((o) => (
        <Text key={o.key} variant="caption">
          ({o.key}) {o.text}
          {item.answer === o.key ? '  ✓' : ''}
        </Text>
      ))}
      <Text variant="caption" muted>
        {item.questionType} · {item.sourceType}
        {item.directive ? ` · ${item.directive}` : ''}
      </Text>
      {item.nodes.map((n) => (
        <Text key={n.id} variant="caption">
          {n.primary ? '● ' : '○ '}
          {n.title}{' '}
          <Text variant="caption" muted>
            ({n.id})
          </Text>
        </Text>
      ))}
      {editing && (
        <View style={{ gap: space.sm }}>
          <Field value={nodes} onChangeText={setNodes} placeholder="node ids, primary first" />
          <Chips value={qType} options={QTYPES} onChange={setQType} />
          <Chips value={sType} options={STYPES} onChange={setSType} />
        </View>
      )}
      {error && <Text muted>{error}</Text>}
      <Status status={status} />
      {status === 'open' && (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {editing ? (
            <Button label="Save correction" onPress={() => void decide(true)} />
          ) : (
            <Button label="Approve" onPress={() => void decide(false)} />
          )}
          <Button
            label={editing ? 'Cancel' : 'Correct'}
            kind="secondary"
            onPress={() => setEditing(!editing)}
          />
        </View>
      )}
    </PaperCard>
  );
}

function SourceCard({
  item,
  onDone,
}: {
  item: Extract<Item, { type: 'source' }>;
  onDone: () => Promise<void>;
}) {
  const [status, setStatus] = useState<'open' | 'approved' | 'corrected'>('open');
  const [editing, setEditing] = useState(false);
  const [sourceId, setSourceId] = useState(item.sourceId);
  const [chapter, setChapter] = useState(item.chapter);
  const [reason, setReason] = useState(item.reason);
  const [error, setError] = useState<string | null>(null);

  const decide = async (correct: boolean) => {
    setError(null);
    try {
      await api.reviewSource(
        item.id,
        correct ? { action: 'correct', sourceId, chapter, reason } : { action: 'approve' },
      );
      setStatus(correct ? 'corrected' : 'approved');
      setEditing(false);
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    }
  };

  return (
    <PaperCard style={{ gap: space.sm }}>
      <Text variant="caption" muted>
        {item.id}
      </Text>
      <Text>{item.nodeTitle}</Text>
      <Text variant="caption">
        {item.sourceLabel} · {item.chapter}
      </Text>
      <Text variant="caption" muted>
        {item.reason}
      </Text>
      {editing && (
        <View style={{ gap: space.sm }}>
          <Field value={sourceId} onChangeText={setSourceId} placeholder="source id" />
          <Field value={chapter} onChangeText={setChapter} placeholder="chapter" />
          <Field value={reason} onChangeText={setReason} placeholder="one-line reason" />
        </View>
      )}
      {error && <Text muted>{error}</Text>}
      <Status status={status} />
      {status === 'open' && (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {editing ? (
            <Button label="Save correction" onPress={() => void decide(true)} />
          ) : (
            <Button label="Approve" onPress={() => void decide(false)} />
          )}
          <Button
            label={editing ? 'Cancel' : 'Correct'}
            kind="secondary"
            onPress={() => setEditing(!editing)}
          />
        </View>
      )}
    </PaperCard>
  );
}
