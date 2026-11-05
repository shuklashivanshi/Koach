import { space, sunlightFor } from '@koach/ui';
import { View } from 'react-native';
import { WindowEngraving } from '@/ui/Engraving';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Today placeholder until onboarding and the planner exist (Phase 3–4). */
export default function Today() {
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
          <WindowEngraving />
          <Text variant="heading">Setting your desk…</Text>
          <Text muted>Your plan arrives after onboarding.</Text>
        </View>
      </Screen>
    </View>
  );
}
