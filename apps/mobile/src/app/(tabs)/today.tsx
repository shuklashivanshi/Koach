import type { CoachState, DecisionStatus, LptProfile, TodayPlan } from '@koach/shared';
import { space, sunlightFor } from '@koach/ui';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { DecisionCard } from '@/optionals/DecisionCard';
import { Button } from '@/ui/Button';
import { WindowEngraving } from '@/ui/Engraving';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Today (UI_SPEC §10.4): the plan for the day, one current task, quick replan.

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
const hm = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
type Task = TodayPlan['tasks'][number];

export function openTask(t: Task) {
  const q = `task=${t.id}`;
  if (t.kind === 'learn' && t.nodeId) router.push(`/learn/${encodeURIComponent(t.nodeId)}?${q}`);
  else if (t.kind === 'revise')
    router.push(`/revise?${q}${t.nodeId ? `&node=${encodeURIComponent(t.nodeId)}` : ''}`);
  else if (t.kind === 'practice' && t.nodeId)
    router.push(`/practice/${encodeURIComponent(t.nodeId)}?${q}`);
  else router.push(`/ca?${q}`);
}

export default function Today() {
  const { c } = useTheme();
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [lpt, setLpt] = useState<LptProfile | null | undefined>(undefined);
  const [coach, setCoach] = useState<CoachState | null>(null);
  const [lighter, setLighter] = useState(false);
  const [decision, setDecision] = useState<DecisionStatus | null>(null);
  const [replanOpen, setReplanOpen] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          const { profile } = await api.profile();
          if (!profile?.onboardedAt) {
            router.replace('/onboarding');
            return;
          }
          const [p, l, co] = await Promise.all([api.today(), api.lptProfile(), api.coach()]);
          setPlan(p);
          setLpt(l.profile);
          setCoach(co);
          setDecision(await api.decision().catch(() => null));
        } catch {
          setError("Couldn't reach the library. Try again.");
        }
      })();
    }, []),
  );

  const now = new Date();
  const light = sunlightFor(now.getHours());
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  const open = plan?.tasks.filter((t) => t.status === 'todo') ?? [];
  const done = plan?.tasks.filter((t) => t.status === 'done') ?? [];
  const current = open[0];

  const replan = async (minutes: number) => {
    setReplanOpen(false);
    setPlan(await api.replan(minutes));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.parchment }}>
      {light && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: light.color,
            opacity: light.opacity,
          }}
        />
      )}
      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          gap: space.md,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Text variant="label" muted smallCaps>
          {date}
        </Text>
        <Text variant="display">{greeting(now.getHours())}</Text>
        {plan && (
          <Text variant="caption" muted>
            {plan.daysToPrelims} days to Prelims · {hm(plan.minutes)} today
          </Text>
        )}
        {plan?.note && (
          <PaperCard style={{ paddingVertical: space.sm }}>
            <Text variant="caption">{plan.note}</Text>
          </PaperCard>
        )}

        {coach?.note && (
          <PaperCard style={{ gap: space.xs }}>
            <Text variant="label" muted smallCaps>
              Your week
            </Text>
            {coach.note.lines.map((l) => (
              <Text key={l} variant="caption">
                {l}
              </Text>
            ))}
            <Button
              label="Got it"
              kind="text"
              onPress={() => void api.noteRead().then(() => setCoach({ ...coach, note: null }))}
            />
          </PaperCard>
        )}
        {coach?.checkInDue && (
          <PaperCard style={{ gap: space.sm }}>
            <Text>How heavy did this week feel?</Text>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              {(['light', 'fine', 'heavy'] as const).map((lv) => (
                <Chip
                  key={lv}
                  label={lv[0]!.toUpperCase() + lv.slice(1)}
                  on={false}
                  onPress={() =>
                    void api.checkIn(lv).then((r) => {
                      setCoach({ ...coach, checkInDue: false });
                      setLighter(r.lighterWeek);
                    })
                  }
                />
              ))}
            </View>
          </PaperCard>
        )}
        {lighter && (
          <Text variant="caption" muted>
            Next week is lighter.
          </Text>
        )}

        {decision && <DecisionCard decision={decision} onOpen={() => router.push('/optionals')} />}

        {lpt === null && (
          <PaperCard style={{ gap: space.sm }}>
            <Text variant="heading">How you learn</Text>
            <Text muted>4 short games · 15 min</Text>
            <Button label="Begin" kind="secondary" onPress={() => router.push('/lpt')} />
          </PaperCard>
        )}

        {plan && !plan.tasks.length && (
          <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.xl }}>
            <WindowEngraving />
            <Text variant="heading">All caught up.</Text>
            <Text muted>Read something you love.</Text>
          </View>
        )}

        {[...open, ...done].map((t) => {
          const isCurrent = t === current;
          return (
            <Pressable
              key={t.id}
              onPress={() => (t.status === 'todo' ? openTask(t) : undefined)}
              onLongPress={() => setWhy(why === t.id ? null : t.id)}
              accessibilityRole="button"
              style={{
                paddingLeft: space.md,
                paddingVertical: space.sm,
                borderLeftWidth: 3,
                borderLeftColor: isCurrent ? c.leather : 'transparent',
                opacity: t.status === 'done' ? 0.5 : 1,
                gap: 2,
              }}
            >
              <Text style={{ textDecorationLine: t.status === 'done' ? 'line-through' : 'none' }}>
                {t.status === 'done' ? '● ' : '○ '}
                {t.title}
              </Text>
              <Text variant="caption" muted>
                {[t.source, `${t.minutes} min`].filter(Boolean).join(' · ')}
              </Text>
              {why === t.id && (
                <Text variant="caption" muted>
                  Why this? {t.reason}
                </Text>
              )}
            </Pressable>
          );
        })}

        {open.length > 0 && (
          <>
            <View style={{ height: 1, backgroundColor: c.hairline, marginVertical: space.sm }} />
            <Button label="Short on time?" kind="text" onPress={() => setReplanOpen(!replanOpen)} />
            {replanOpen && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: space.xs,
                  justifyContent: 'center',
                }}
              >
                {[30, 45, 60, 90].map((m) => (
                  <Chip key={m} label={`${m} min`} on={false} onPress={() => void replan(m)} />
                ))}
              </View>
            )}
            {current && <Button label="Begin" onPress={() => openTask(current)} />}
          </>
        )}
        {error && <Text muted>{error}</Text>}
      </ScrollView>
    </View>
  );
}
