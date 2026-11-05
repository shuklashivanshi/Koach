import { space } from '@koach/ui';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { signInWithGoogle } from '@/auth/firebase';
import { Button } from '@/ui/Button';
import { WindowEngraving } from '@/ui/Engraving';
import { MarginNote } from '@/ui/MarginNote';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Welcome (UI_SPEC §10.1). Signed-in users never see this: the root layout guards it. */
export default function Welcome() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const clearNote = useCallback(() => setNote(null), []);

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle(); // cancelled is silent
    } catch {
      setNote("Couldn't sign in. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: space.md, marginBottom: space['3xl'] }}>
        <WindowEngraving />
        <Text variant="display" style={{ fontSize: 44, lineHeight: 50 }}>
          Koach
        </Text>
        <Text variant="body" muted>
          Study, with a quiet mind.
        </Text>
      </View>
      <View style={{ gap: space.sm }}>
        <Button label="Continue with Google" onPress={google} busy={busy} testID="google" />
        <Button
          label="Use email instead"
          kind="text"
          onPress={() => router.push('/sign-in/email')}
        />
      </View>
      <MarginNote message={note} onDone={clearNote} />
    </Screen>
  );
}
