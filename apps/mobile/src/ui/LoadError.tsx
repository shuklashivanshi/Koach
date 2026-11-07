import { space } from '@koach/ui';
import { View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';

/** The generic failure state (UI_SPEC §11): one line and a text button. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text>Couldn't reach the library. Try again.</Text>
      <Button label="Try again" kind="text" align="start" onPress={onRetry} />
    </View>
  );
}
