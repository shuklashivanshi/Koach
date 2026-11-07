import { View } from 'react-native';
import { Text } from './Text';

/** A numeral over a small-caps label (UI_SPEC §7), e.g. `12` / `DUE`. */
export function Stat({ value, label, testID }: { value: string; label: string; testID?: string }) {
  return (
    <View testID={testID} accessible accessibilityLabel={`${value} ${label}`} style={{ flex: 1 }}>
      <Text variant="numeral">{value}</Text>
      <Text variant="label" muted smallCaps>
        {label}
      </Text>
    </View>
  );
}
