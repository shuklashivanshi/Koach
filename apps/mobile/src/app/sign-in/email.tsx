import { EmailStartRequest, EmailVerifyRequest } from '@koach/shared';
import { radius, space, type as typeScale } from '@koach/ui';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { ApiError, api } from '@/api/client';
import { signInWithEmailCodeToken } from '@/auth/firebase';
import { Button } from '@/ui/Button';
import { MarginNote } from '@/ui/MarginNote';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/useTheme';

const RESEND_AFTER_S = 30;

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'invalid_code') return "That code didn't match. Try again.";
    if (err.code === 'too_many_requests') return 'Too many tries. Wait a few minutes.';
    if (err.code === 'network') return "Couldn't reach the library. Try again.";
  }
  return 'Something went wrong. Try again.';
}

export default function EmailSignIn() {
  const { c } = useTheme();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const clearNote = useCallback(() => setNote(null), []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const input = {
    ...typeScale.body,
    color: c.ink,
    backgroundColor: c.cream,
    borderColor: c.hairline,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: space.md,
    minHeight: 52,
  };

  const send = async () => {
    if (!EmailStartRequest.safeParse({ email: email.trim() }).success) {
      return setNote('Enter a valid email.');
    }
    setBusy(true);
    try {
      await api.emailStart(email.trim());
      setStep('code');
      setWait(RESEND_AFTER_S);
    } catch (err) {
      setNote(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!EmailVerifyRequest.safeParse({ email: email.trim(), code }).success) {
      return setNote('Enter the 6-digit code.');
    }
    setBusy(true);
    try {
      const { customToken } = await api.emailVerify(email.trim(), code);
      await signInWithEmailCodeToken(customToken);
      // The root layout's guard moves the user to Today once Firebase reports the session.
    } catch (err) {
      setNote(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingTop: space['2xl'], gap: space.lg }}>
      <Button label="Back" kind="text" align="start" onPress={() => router.back()} />
      {step === 'email' ? (
        <>
          <Text variant="heading">Sign in with email</Text>
          <TextInput
            testID="email-input"
            style={input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={c.inkMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            accessibilityLabel="Email"
          />
          <Button label="Send code" onPress={send} busy={busy} testID="send-code" />
        </>
      ) : (
        <>
          <View style={{ gap: space.xs }}>
            <Text variant="heading">Check your email</Text>
            <Text muted>We sent a 6-digit code.</Text>
          </View>
          <TextInput
            testID="code-input"
            style={[input, { letterSpacing: 8, textAlign: 'center', fontSize: 22 }]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            accessibilityLabel="6-digit code"
          />
          <Button label="Sign in" onPress={verify} busy={busy} testID="verify-code" />
          <Button
            label={wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
            kind="text"
            disabled={wait > 0 || busy}
            onPress={send}
          />
        </>
      )}
      <MarginNote message={note} onDone={clearNote} />
    </Screen>
  );
}
