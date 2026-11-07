import type { OptionalChoiceResult } from '@koach/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Field } from '@/lpt/games';
import { formatWeekday, localIsoDate } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

// Choosing an optional (OPT-04; UI_SPEC 10.11): reasons, a confirmation, then `Added to your
// plan.` with exactly when it joins. One primary per step.

type Step = 'reasons' | 'confirm' | 'done';

/** The day wording comes from the API's startsOn compared with today's local date. */
export function joinsLine(startsOn: string, now: Date = new Date()): string {
  const today = localIsoDate(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (startsOn <= today) return 'It joins your plan from today.';
  if (startsOn === localIsoDate(tomorrow)) return 'It joins your plan from tomorrow.';
  return `It joins your plan from ${formatWeekday(startsOn)}.`;
}

export function ChooseSheet({
  visible,
  slug,
  name,
  current,
  onClose,
  onChosen,
}: {
  visible: boolean;
  slug: string;
  name: string;
  /** The optional already chosen (with its display name when known), or null. */
  current: { chosen: string; reasons: string | null; name: string | null } | null;
  onClose: () => void;
  onChosen: (result: OptionalChoiceResult) => void;
}) {
  const [step, setStep] = useState<Step>('reasons');
  const [reasons, setReasons] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<OptionalChoiceResult | null>(null);

  useEffect(() => {
    if (visible) return;
    setStep('reasons');
    setError(false);
    setResult(null);
  }, [visible]);
  useEffect(() => {
    if (visible && current?.reasons && !reasons) setReasons(current.reasons);
    // Only seed the field when the sheet opens.
  }, [visible]);

  const replaces = current && current.chosen !== slug;

  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      const r = await api.chooseOptional(slug, reasons.trim());
      setResult(r);
      setStep('done');
      onChosen(r);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="choose-sheet">
      {step === 'reasons' && (
        <>
          <Text variant="heading">Your reasons</Text>
          <Text muted>Why {name}? A line or two, in your words. You can change it later.</Text>
          <Field
            value={reasons}
            onChangeText={setReasons}
            placeholder="Why this optional, in your words"
            lines={3}
          />
          <Button
            label="Make it my optional"
            disabled={reasons.trim().length < 3}
            onPress={() => setStep('confirm')}
            testID="choose-start"
          />
          <Button label="Close" kind="text" onPress={onClose} />
        </>
      )}
      {step === 'confirm' && (
        <>
          <Text variant="heading">{`Choose ${name}?`}</Text>
          {replaces && <Text>{`This replaces ${current.name ?? 'your current optional'}.`}</Text>}
          <Text muted>Its units join your plan as 90-minute Learn tasks.</Text>
          {error && <Text>Couldn't reach the library. Try again.</Text>}
          <Button label="Confirm" busy={busy} onPress={() => void save()} testID="choose-confirm" />
          <Button
            label="Keep looking"
            kind="secondary"
            disabled={busy}
            onPress={() => {
              setError(false);
              setStep('reasons');
            }}
          />
        </>
      )}
      {step === 'done' && result && (
        <>
          <Text variant="heading">Added to your plan.</Text>
          <Text>{joinsLine(result.startsOn)}</Text>
          {result.pausedForPrelims && <Text muted>Optional study resumes after Prelims.</Text>}
          <Button
            label="See the outline"
            onPress={() => {
              onClose();
              router.push('/optionals/outline');
            }}
            testID="choose-outline"
          />
          <Button label="Close" kind="text" onPress={onClose} />
        </>
      )}
    </Sheet>
  );
}
