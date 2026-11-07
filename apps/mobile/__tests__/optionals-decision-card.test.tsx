import type { DecisionStatus } from '@koach/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DecisionCard } from '@/optionals/DecisionCard';
import { deadlineCaption } from '@/optionals/format';

const status = (over: Partial<DecisionStatus> = {}): DecisionStatus => ({
  deadline: '2026-12-15',
  daysLeft: 10,
  chosen: null,
  reasons: null,
  quizTaken: false,
  ...over,
});

test('upcoming: overline, title and days left', async () => {
  await render(<DecisionCard decision={status()} onOpen={jest.fn()} />);
  expect(screen.getByText('DECIDE BY 15 DEC')).toBeTruthy();
  expect(screen.getByText('Choose your optional')).toBeTruthy();
  expect(screen.getByText('10 days left')).toBeTruthy();
});

test('one day left is singular', async () => {
  await render(<DecisionCard decision={status({ daysLeft: 1 })} onOpen={jest.fn()} />);
  expect(screen.getByText('1 day left')).toBeTruthy();
});

test('today says Decide today', async () => {
  await render(<DecisionCard decision={status({ daysLeft: 0 })} onOpen={jest.fn()} />);
  expect(screen.getByText('Decide today')).toBeTruthy();
});

test('overdue keeps the card with days past your date', async () => {
  await render(<DecisionCard decision={status({ daysLeft: -3 })} onOpen={jest.fn()} />);
  expect(screen.getByText('DECIDE BY 15 DEC')).toBeTruthy();
  expect(screen.getByText('3 days past your date')).toBeTruthy();
});

test('one day overdue is singular', async () => {
  await render(<DecisionCard decision={status({ daysLeft: -1 })} onOpen={jest.fn()} />);
  expect(screen.getByText('1 day past your date')).toBeTruthy();
});

test('once an optional is chosen the card renders nothing', async () => {
  await render(<DecisionCard decision={status({ chosen: 'sociology' })} onOpen={jest.fn()} />);
  expect(screen.queryByText('Choose your optional')).toBeNull();
  expect(screen.queryByTestId('decision-open')).toBeNull();
});

test('Open calls onOpen', async () => {
  const onOpen = jest.fn();
  await render(<DecisionCard decision={status()} onOpen={onOpen} />);
  await fireEvent.press(screen.getByText('Open'));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('captions never use exclamation marks', () => {
  for (const d of [14, 1, 0, -1, -40]) expect(deadlineCaption(d)).not.toContain('!');
});
