import { radius, space } from '@koach/ui';
import type { PropsWithChildren } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from './useTheme';

export function PaperCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.cream,
          borderColor: c.hairline,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: space.lg,
          shadowColor: c.ink,
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
