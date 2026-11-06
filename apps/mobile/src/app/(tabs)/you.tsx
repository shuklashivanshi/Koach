import { space } from '@koach/ui';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { signOut } from '@/auth/firebase';
import { appConfig } from '@/config';
import { shareJson } from '@/files';
import { Button } from '@/ui/Button';
import { MarginNote } from '@/ui/MarginNote';
import { PaperCard } from '@/ui/PaperCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

function Row({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 52,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: c.hairline,
      }}
    >
      <Text style={danger ? { color: c.rosewood } : undefined}>{label}</Text>
    </Pressable>
  );
}

export default function You() {
  const auth = useAuth();
  const { c } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const clearNote = useCallback(() => setNote(null), []);
  const email = auth.status === 'signed-in' ? auth.user.email : null;

  const exportData = async () => {
    try {
      await shareJson('koach-export.json', await api.exportData());
    } catch {
      setNote("Couldn't reach the library. Try again.");
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await api.deleteAccount();
      setConfirming(false);
      await signOut();
    } catch {
      setNote("Couldn't delete right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingTop: space['2xl'] }}>
      <Pressable
        testID="you-header"
        onLongPress={appConfig.devTools ? () => router.push('/dev') : undefined}
        accessibilityRole="header"
      >
        <Text variant="display">You</Text>
        {email && <Text muted>{email}</Text>}
      </Pressable>
      <View style={{ marginTop: space.xl }}>
        <Row label="Memory heatmap" onPress={() => router.push('/library')} />
        <Row label="Mistakes" onPress={() => router.push('/mistakes')} />
        <Row label="How you learn" onPress={() => router.push('/lpt')} />
        <Row label="Listen and revise" onPress={() => router.push('/playlist')} />
        <Row label="Memory palace" onPress={() => router.push('/palace')} />
        <Row label="Reminders" onPress={() => router.push('/reminders')} />
        <Row label="Export data" onPress={exportData} />
        <Row label="Sign out" onPress={() => void signOut()} />
        <Row label="Delete account" onPress={() => setConfirming(true)} danger />
      </View>

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
      >
        <View
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(58,46,36,0.25)' }}
        >
          <PaperCard
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: space.md }}
          >
            <Text variant="heading">Delete account</Text>
            <Text>This erases your plan, notes and history. It can't be undone.</Text>
            <Button
              label="Delete"
              kind="danger"
              onPress={deleteAccount}
              busy={busy}
              testID="confirm-delete"
            />
            <Button
              label="Keep"
              kind="secondary"
              onPress={() => setConfirming(false)}
              testID="keep"
            />
          </PaperCard>
        </View>
      </Modal>
      <MarginNote message={note} onDone={clearNote} />
      <View style={{ height: 1, backgroundColor: c.parchment }} />
    </Screen>
  );
}
