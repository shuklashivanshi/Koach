import type { Playlist } from '@koach/shared';
import { space } from '@koach/ui';
import { type AudioPlayer, createAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { api } from '@/api/client';
import { cacheAudio } from '@/files';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Background audio revision (CUE-03): spoken cue sheets and chants for recent topics, back to back.
export default function RevisionPlaylist() {
  const { c } = useTheme();
  const [list, setList] = useState<Playlist['tracks'] | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    void api.playlist().then((p) => setList(p.tracks));
    return () => player.current?.remove();
  }, []);

  const play = async (i: number) => {
    const track = list?.[i];
    player.current?.remove();
    if (!track) return setCurrent(null);
    setCurrent(i);
    const { audioBase64 } = await api.cueAudio(track.cueId);
    const p = createAudioPlayer(await cacheAudio(`track-${track.cueId}.mp3`, audioBase64));
    player.current = p;
    p.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) void play(i + 1);
    });
    p.play();
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.parchment }}
      contentContainerStyle={{
        padding: space.lg,
        gap: space.md,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      <Text variant="heading">Listen and revise</Text>
      {list && !list.length && (
        <Text muted>
          Open “Make it stick” on a topic and choose Spoken sheet or Chant to fill this list.
        </Text>
      )}
      {list?.map((t, i) => (
        <Text key={t.cueId} variant={current === i ? 'label' : 'body'}>
          {current === i ? '▶ ' : ''}
          {t.title}
        </Text>
      ))}
      {list && list.length > 0 && (
        <Button
          label={current === null ? 'Play all' : 'Stop'}
          onPress={() => {
            if (current === null) void play(0);
            else {
              player.current?.remove();
              player.current = null;
              setCurrent(null);
            }
          }}
        />
      )}
    </ScrollView>
  );
}
