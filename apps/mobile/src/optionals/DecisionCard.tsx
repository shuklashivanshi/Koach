import type { DecisionStatus } from '@koach/shared';
import { space } from '@koach/ui';
import { deadlineCaption, formatDay } from '@/optionals/format';
import { Button } from '@/ui/Button';
import { PaperCard } from '@/ui/PaperCard';
import { Text } from '@/ui/Text';

/**
 * The Today deadline card (D-05): shown until an optional is chosen, including after the date
 * has passed. Calm wording, no red, no exclamation marks.
 */
export function DecisionCard({
  decision,
  onOpen,
}: {
  decision: DecisionStatus;
  onOpen: () => void;
}) {
  if (decision.chosen) return null;
  return (
    <PaperCard style={{ gap: space.xs }}>
      <Text variant="label" muted testID="decision-overline">
        {`DECIDE BY ${formatDay(decision.deadline).toUpperCase()}`}
      </Text>
      <Text variant="title">Choose your optional</Text>
      <Text variant="caption" muted>
        {deadlineCaption(decision.daysLeft)}
      </Text>
      <Button label="Open" kind="secondary" onPress={onOpen} testID="decision-open" />
    </PaperCard>
  );
}
