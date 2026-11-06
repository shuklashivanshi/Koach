import { space } from '@koach/ui';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/api/client';
import { Field } from '@/lpt/games';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Memory palace setup (CUE-02): once, a few rooms you know well, with spots in walking order.

type Room = { name: string; loci: string };

export default function PalaceSetup() {
  const { c } = useTheme();
  const [rooms, setRooms] = useState<Room[]>([
    { name: 'Front door', loci: 'doormat, shoe rack, umbrella stand' },
  ]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void api.palace().then((p) => {
      if (p.rooms.length) setRooms(p.rooms.map((r) => ({ name: r.name, loci: r.loci.join(', ') })));
    });
  }, []);
  const set = (i: number, patch: Partial<Room>) =>
    setRooms(rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = async () => {
    await api.savePalace({
      rooms: rooms
        .map((r) => ({
          name: r.name.trim(),
          loci: r.loci
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 10),
        }))
        .filter((r) => r.name && r.loci.length),
    });
    setSaved(true);
  };
  const spots = rooms.reduce((a, r) => a + r.loci.split(',').filter((x) => x.trim()).length, 0);
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
      <Text variant="heading">Your memory palace</Text>
      <Text muted>
        Rooms you know well, and spots in each in the order you’d walk past them. Eight or more
        spots work best.
      </Text>
      {rooms.map((r, i) => (
        <View key={i} style={{ gap: space.xs }}>
          <Field value={r.name} onChangeText={(name) => set(i, { name })} placeholder="Room" />
          <Field
            value={r.loci}
            onChangeText={(loci) => set(i, { loci })}
            placeholder="Spots, separated by commas"
          />
        </View>
      ))}
      {rooms.length < 6 && (
        <Button
          label="Add a room"
          kind="text"
          onPress={() => setRooms([...rooms, { name: '', loci: '' }])}
        />
      )}
      <Text variant="caption" muted>
        {spots} spots
      </Text>
      <Button label={saved ? 'Saved' : 'Save'} onPress={() => void save()} />
    </ScrollView>
  );
}
