import { space } from '@koach/ui';
import { createAudioPlayer } from 'expo-audio';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '@/api/client';
import { appConfig } from '@/config';
import { cacheAudio } from '@/files';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Dev-only: proves the Gemini + TTS path from the phone (Phase 1 success criterion 4). */
export default function Dev() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; model: string; costUsd: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  if (!appConfig.devTools) return <Redirect href="/today" />;

  const ping = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.aiPing();
      setResult(res);
      if (res.audioBase64) {
        const uri = await cacheAudio(`ping-${Date.now()}.mp3`, res.audioBase64);
        createAudioPlayer(uri).play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingTop: space['2xl'], gap: space.lg }}>
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Dev</Text>
      <Text muted>API: {appConfig.apiUrl}</Text>
      <Button label="Ping AI" onPress={ping} busy={busy} testID="ping" />
      {result && (
        <PaperCard style={{ gap: space.sm }}>
          <Text>{result.text}</Text>
          <Text variant="caption" muted>
            {result.model} · ${result.costUsd.toFixed(6)}
          </Text>
        </PaperCard>
      )}
      {error && <Text muted>{error}</Text>}
      <View />
    </Screen>
  );
}
