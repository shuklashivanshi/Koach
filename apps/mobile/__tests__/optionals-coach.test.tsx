import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { api } from '@/api/client';
import { CoachSheet } from '@/optionals/CoachSheet';
import { deadlineOverline, formatDay } from '@/optionals/format';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('@/api/client', () => ({
  api: { decision: jest.fn(), optional: jest.fn(), askCoach: jest.fn(), stress: jest.fn() },
}));

const m = (f: unknown) => f as jest.Mock;
const status = (daysLeft: number) => ({
  deadline: '2026-12-15',
  daysLeft,
  chosen: null,
  reasons: null,
  quizTaken: false,
});
const reply = (answer: string, over: Record<string, unknown> = {}) => ({
  answer,
  stressTest: null,
  deadline: { date: '2026-12-15', daysLeft: 10, overdue: false },
  resting: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  m(api.decision).mockResolvedValue(status(10));
  m(api.optional).mockResolvedValue({
    slug: 'sociology',
    name: 'Sociology',
    topics: ['A', 'B', 'C'],
  });
});

test('formatDay is locale independent', () => {
  expect(formatDay('2026-12-15')).toBe('15 Dec');
  expect(formatDay('2027-01-03')).toBe('3 Jan');
  expect(deadlineOverline('2026-12-15', 10)).toBe('DECIDE BY 15 DEC');
  expect(deadlineOverline('2026-12-15', -1)).toBe('PAST 15 DEC · 1 DAY');
});

test('the overline shows the date for an upcoming deadline', async () => {
  await render(<CoachSheet visible slugs={[]} onClose={jest.fn()} />);
  expect(await screen.findByText('DECIDE BY 15 DEC')).toBeTruthy();
});

test('the overline shows days past for an overdue deadline', async () => {
  m(api.decision).mockResolvedValue(status(-3));
  await render(<CoachSheet visible slugs={[]} onClose={jest.fn()} />);
  expect(await screen.findByText('PAST 15 DEC · 3 DAYS')).toBeTruthy();
});

test('a chip fills the question field', async () => {
  await render(<CoachSheet visible slugs={[]} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByText('Is it too long?'));
  expect(screen.getByDisplayValue('Is it too long for the hours I have?')).toBeTruthy();
});

test('asking sends an empty history first, then the previous exchange', async () => {
  m(api.askCoach)
    .mockResolvedValueOnce(reply('First answer'))
    .mockResolvedValueOnce(reply('Second'));
  await render(<CoachSheet visible slugs={['sociology']} onClose={jest.fn()} />);
  await fireEvent.changeText(screen.getByPlaceholderText('Ask in your own words'), 'Is it long?');
  await fireEvent.press(screen.getByTestId('coach-ask'));
  await waitFor(() => expect(screen.getByText('First answer')).toBeTruthy());
  expect(api.askCoach).toHaveBeenLastCalledWith('Is it long?', ['sociology'], []);

  await fireEvent.changeText(screen.getByPlaceholderText('Ask in your own words'), 'And scoring?');
  await fireEvent.press(screen.getByTestId('coach-ask'));
  await waitFor(() => expect(screen.getByText('Second')).toBeTruthy());
  expect(api.askCoach).toHaveBeenLastCalledWith(
    'And scoring?',
    ['sociology'],
    [{ q: 'Is it long?', a: 'First answer' }],
  );
});

test('a resting reply renders its text without crashing', async () => {
  m(api.askCoach).mockResolvedValue(
    reply('The coach is resting. Your plan still works.', { resting: true }),
  );
  await render(<CoachSheet visible slugs={[]} onClose={jest.fn()} />);
  await fireEvent.changeText(screen.getByPlaceholderText('Ask in your own words'), 'Hello there');
  await fireEvent.press(screen.getByTestId('coach-ask'));
  expect(await screen.findByText('The coach is resting. Your plan still works.')).toBeTruthy();
});

test('a failed ask shows the generic error', async () => {
  m(api.askCoach).mockRejectedValue(new Error('x'));
  await render(<CoachSheet visible slugs={[]} onClose={jest.fn()} />);
  await fireEvent.changeText(screen.getByPlaceholderText('Ask in your own words'), 'Hello there');
  await fireEvent.press(screen.getByTestId('coach-ask'));
  expect(await screen.findByText("Couldn't reach the library. Try again.")).toBeTruthy();
});

test('the hours check shows the verdict and, after Why?, the facts', async () => {
  m(api.stress).mockResolvedValue({
    kind: 'hours',
    title: 'Hours check',
    body: 'About 200 of the 300 hours you need are free before Mains.',
    verdict: 'tight',
    facts: ['22.5 hours a week'],
  });
  await render(<CoachSheet visible slugs={['sociology']} onClose={jest.fn()} />);
  await screen.findByText('On Sociology');
  await fireEvent.press(screen.getByText('Hours check'));
  expect(await screen.findByTestId('stress-verdict')).toHaveTextContent('Tight');
  expect(api.stress).toHaveBeenCalledWith({ kind: 'hours', slug: 'sociology' });
  expect(screen.queryByText('22.5 hours a week')).toBeNull();
  await fireEvent.press(screen.getByTestId('stress-why'));
  expect(screen.getByText('22.5 hours a week')).toBeTruthy();
});

test('the 3-line answer asks for the unit, then for feedback on the text', async () => {
  m(api.stress)
    .mockResolvedValueOnce({
      kind: 'answer',
      title: 'Social stratification',
      body: 'Write three lines on this unit.',
      verdict: null,
      facts: ['Unit 2 of 3'],
    })
    .mockResolvedValueOnce({
      kind: 'answer',
      title: 'Social stratification',
      body: 'Good start. Add one example.',
      verdict: null,
      facts: ['Unit 2 of 3'],
    });
  m(api.askCoach).mockResolvedValue(reply('Noted'));
  await render(<CoachSheet visible slugs={['sociology']} onClose={jest.fn()} />);
  await screen.findByText('On Sociology');
  await fireEvent.press(screen.getByText('3-line answer'));
  expect(await screen.findByText('Social stratification')).toBeTruthy();
  expect(api.stress).toHaveBeenNthCalledWith(1, {
    kind: 'answer',
    slug: 'sociology',
    unit: expect.any(Number),
  });
  await fireEvent.changeText(
    screen.getByPlaceholderText('Three lines, as you would write in the exam'),
    'Stratification is the ranking of groups by power and wealth.',
  );
  await fireEvent.press(screen.getByTestId('answer-feedback'));
  expect(await screen.findByText('Good start. Add one example.')).toBeTruthy();
  expect(api.stress).toHaveBeenNthCalledWith(2, {
    kind: 'answer',
    slug: 'sociology',
    unit: expect.any(Number),
    text: 'Stratification is the ranking of groups by power and wealth.',
  });

  // The stress test is part of the conversation the coach remembers.
  await fireEvent.changeText(screen.getByPlaceholderText('Ask in your own words'), 'What next?');
  await fireEvent.press(screen.getByTestId('coach-ask'));
  await waitFor(() => expect(api.askCoach).toHaveBeenCalled());
  const history = m(api.askCoach).mock.calls[0]?.[2] as { q: string; a: string }[];
  expect(history).toHaveLength(1);
  expect(history[0]?.q).toBe('Stress test: Social stratification');
  expect(history[0]?.a).toContain('Stratification is the ranking');
});
