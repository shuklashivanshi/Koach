import type { NotificationSettings } from '@koach/shared';
import { radius, space } from '@koach/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { api } from '@/api/client';
import { Chip } from '@/app/onboarding';
import { canPush, enablePush } from '@/push';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Reminder settings (NOTIF-02): each type on/off with its time, and the tone.
const LABELS = {
  plan_ready: 'Plan ready',
  due_reviews: 'Reviews due',
  ca_quiz: 'Current affairs quiz',
  streak: 'Streak at risk',
} as const;

export default function Reminders() {
  const { c } = useTheme();
  const [s, setS] = useState<NotificationSettings | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    void api.notifications().then(({ publicKey, ...rest }) => {
      setS(rest);
      setKey(publicKey);
    });
  }, []);
  if (!s) return <View style={{ flex: 1, backgroundColor: c.parchment }} />;

  const save = async (next: NotificationSettings) => {
    setS(next);
    await api.saveNotifications(next);
  };
  const enable = async () => {
    if (!key) return setStatus('Reminders aren’t set up on this server.');
    const sub = await enablePush(key).catch(() => null);
    if (!sub) return setStatus('Notifications are blocked in this browser.');
    await api.subscribePush(sub);
    setStatus('This device will get reminders.');
  };

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
      <Text variant="heading">Reminders</Text>
      {canPush && (
        <Button label="Turn on for this device" kind="secondary" onPress={() => void enable()} />
      )}
      {status && (
        <Text variant="caption" muted>
          {status}
        </Text>
      )}
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Chip
            label={LABELS[k]}
            on={s.prefs[k].on}
            onPress={() =>
              void save({ ...s, prefs: { ...s.prefs, [k]: { ...s.prefs[k], on: !s.prefs[k].on } } })
            }
          />
          <TextInput
            value={s.prefs[k].time}
            onChangeText={(time) =>
              setS({ ...s, prefs: { ...s.prefs, [k]: { ...s.prefs[k], time } } })
            }
            onBlur={() => /^\d{2}:\d{2}$/.test(s.prefs[k].time) && void save(s)}
            style={{
              width: 72,
              borderWidth: 1,
              borderColor: c.hairline,
              borderRadius: radius.button,
              padding: space.xs,
              color: c.ink,
              backgroundColor: c.cream,
              textAlign: 'center',
            }}
          />
        </View>
      ))}
      <Text variant="label" muted smallCaps>
        Tone
      </Text>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {(['calm', 'firm', 'cheerful'] as const).map((t) => (
          <Chip
            key={t}
            label={t[0]!.toUpperCase() + t.slice(1)}
            on={s.tone === t}
            onPress={() => void save({ ...s, tone: t })}
          />
        ))}
      </View>
      <Text variant="caption" muted>
        Never during your work or quiet hours.
      </Text>
      <Button label="Send a test reminder" kind="text" onPress={() => void api.testPush()} />
    </ScrollView>
  );
}
