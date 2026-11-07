import { layout, radius, space } from '@koach/ui';
import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from './useTheme';

/**
 * A cream bottom sheet over a soft scrim (UI_SPEC §6: contextual help and the Decision Coach
 * open as sheets). Scrolls when its content is tall; tapping the scrim closes it.
 */
export function Sheet({
  visible,
  onClose,
  children,
  testID,
}: PropsWithChildren<{ visible: boolean; onClose: () => void; testID?: string }>) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(58,46,36,0.25)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          testID={testID}
          style={{
            maxHeight: '88%',
            width: '100%',
            maxWidth: layout.maxContentWidth,
            alignSelf: 'center',
            backgroundColor: c.cream,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            borderColor: c.hairline,
            borderWidth: 1,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: space.lg, gap: space.md }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
