import { space } from '@koach/ui';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { WindowEngraving } from '@/ui/Engraving';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

// Current affairs quiz slot; the quiz itself arrives in Phase 5.
export default function CurrentAffairs() {
  const { c } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.parchment,
        padding: space.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
      }}
    >
      <WindowEngraving />
      <Text variant="heading">Today’s paper isn’t in yet.</Text>
      <Text muted>Check back after 6 am.</Text>
      <Button label="Back" kind="text" onPress={() => router.back()} />
    </View>
  );
}
