import type { LptProfile } from '@koach/shared';
import { space, sunlightFor } from '@koach/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '@/api/client';
import { StrengthBars } from '@/lpt/StrengthBars';
import { Button } from '@/ui/Button';
import { WindowEngraving } from '@/ui/Engraving';
import { PaperCard } from '@/ui/PaperCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Today until the planner exists (Phase 4): onboarding gate, the learning-pattern card, profile. */
export default function Today() {
  const [lpt, setLpt] = useState<LptProfile | null | undefined>(undefined);
  useEffect(() => {
    void (async () => {
      try {
        const { profile } = await api.profile();
        if (!profile?.onboardedAt) {
          router.replace('/onboarding');
          return;
        }
        setLpt((await api.lptProfile()).profile);
      } catch {
        setLpt(null);
      }
    })();
  }, []);
  const now = new Date();
  const light = sunlightFor(now.getHours());
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View style={{ flex: 1 }}>
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
      <Screen style={{ paddingTop: space['2xl'], backgroundColor: 'transparent' }}>
        <Text variant="label" muted smallCaps>
          {date}
        </Text>
        <Text variant="display" style={{ marginTop: space.xs }}>
          {greeting(now.getHours())}
        </Text>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.lg }}>
          {lpt === null && (
            <PaperCard style={{ gap: space.sm }}>
              <Text variant="heading">How you learn</Text>
              <Text muted>4 short games · 15 min</Text>
              <Button label="Begin" onPress={() => router.push('/lpt')} />
            </PaperCard>
          )}
          {lpt && (
            <PaperCard style={{ gap: space.md }}>
              <Text variant="label" muted smallCaps>
                Your learning strengths
              </Text>
              <StrengthBars scores={lpt.scores} />
              <Text>{lpt.line}</Text>
              {new Date(lpt.retestDue) <= now && (
                <Button label="Retake the games" kind="text" onPress={() => router.push('/lpt')} />
              )}
            </PaperCard>
          )}
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <WindowEngraving />
            <Text variant="heading">Setting your desk…</Text>
            <Text muted>Your plan will be ready in a moment.</Text>
          </View>
        </View>
      </Screen>
    </View>
  );
}
