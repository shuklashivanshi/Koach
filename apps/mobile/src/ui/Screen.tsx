import { layout, space } from '@koach/ui';
import type { PropsWithChildren } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';

/** Parchment background, 16px gutters, content capped at 560 wide (UI_SPEC §5). */
export function Screen({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { c } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.parchment }}>
      <View
        style={[
          {
            flex: 1,
            width: '100%',
            maxWidth: layout.maxContentWidth,
            alignSelf: 'center',
            paddingHorizontal: space.md,
          },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
