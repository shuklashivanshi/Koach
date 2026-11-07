import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/api/client';
import Quiz from '@/app/optionals/quiz';

jest.mock('@/api/client', () => ({ api: { fitQuiz: jest.fn(), fits: jest.fn() } }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
// The real Chip lives in the onboarding route, which pulls in reanimated (not available in jest).
jest.mock('@/app/onboarding', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Chip: ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
      <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const fit = (slug: string, name: string, score: number, reason: string, surprising = false) => ({
  slug,
  name,
  score,
  reason,
  surprising,
  components: {
    interest: 0.8,
    background: 0.5,
    overlap: 0.4,
    writingStyle: 0.6,
    materials: 0.9,
    time: 0.7,
    stability: 0.3,
  },
});
const ranking = {
  top: [
    fit('political-science', 'Political Science and IR', 0.93, 'Strong match on what you enjoy.'),
    fit('geography', 'Geography', 0.8, 'Overlaps the GS syllabus.'),
    fit('sociology', 'Sociology', 0.7, 'Compact books and papers.'),
    fit('history', 'History', 0.6, 'Fits your hours.'),
    fit('anthropology', 'Anthropology', 0.41, 'Steady results.'),
  ],
  surprising: [fit('philosophy', 'Philosophy', 0.85, 'A surprise worth a look.', true)],
  weights: {
    interest: 0.3,
    background: 0.2,
    overlap: 0.15,
    writingStyle: 0.1,
    materials: 0.1,
    time: 0.1,
    stability: 0.05,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

const next = () => fireEvent.press(screen.getByTestId('quiz-next'));
const nextDisabled = () => screen.getByTestId('quiz-next').props.accessibilityState.disabled;

/** Walks all seven steps with typical answers, stopping on the last step. */
async function walkToLastStep() {
  await render(<Quiz />);
  await fireEvent.press(screen.getByText('Engineering'));
  await next();
  await fireEvent.press(screen.getByText('Politics'));
  await fireEvent.press(screen.getByText('History'));
  await next();
  await fireEvent.press(screen.getByText('Debates'));
  await next();
  await fireEvent.press(screen.getByText('Analytical'));
  await next();
  await fireEvent.press(screen.getByText('500h'));
  await next();
  await fireEvent.changeText(
    screen.getByPlaceholderText('e.g. hindi, english'),
    ' Hindi, English ,',
  );
  await next();
  await fireEvent.press(screen.getByText('Happy to bet'));
}

test('walking all seven steps posts the expected body to fitQuiz', async () => {
  (api.fitQuiz as jest.Mock).mockResolvedValue(ranking);
  await walkToLastStep();
  expect(screen.getByText('Your risk')).toBeTruthy();
  expect(screen.getByText('See my fits')).toBeTruthy();
  await next();
  await waitFor(() => expect(api.fitQuiz).toHaveBeenCalledTimes(1));
  expect(api.fitQuiz).toHaveBeenCalledWith({
    background: 'engineering',
    interests: ['politics', 'history'],
    reading: ['debates'],
    answerStyle: ['analytical'],
    hours: 500,
    languages: ['hindi', 'english'],
    risk: 0.8,
  });
});

test('Back keeps earlier answers, and the first step goes to router.back', async () => {
  await render(<Quiz />);
  await fireEvent.press(screen.getByTestId('quiz-back'));
  expect(router.back).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Medicine'));
  await next();
  await fireEvent.press(screen.getByText('Society'));
  await fireEvent.press(screen.getByTestId('quiz-back'));
  expect(screen.getByText('Your degree')).toBeTruthy();
  const medicine = screen.getByText('Medicine');
  expect(medicine).toBeTruthy();
  await next();
  // The earlier interest is still chosen: Next is enabled without picking again.
  expect(nextDisabled()).toBe(false);
});

test('Next is disabled until a degree and at least one interest are chosen', async () => {
  await render(<Quiz />);
  expect(nextDisabled()).toBe(true);
  await fireEvent.press(screen.getByText('Law'));
  expect(nextDisabled()).toBe(false);
  await next();
  expect(screen.getByText('What you enjoy')).toBeTruthy();
  expect(nextDisabled()).toBe(true);
  await fireEvent.press(screen.getByText('Society'));
  expect(nextDisabled()).toBe(false);
});

test('results show five rows with reasons, Surprising fits, and Why? weights', async () => {
  (api.fitQuiz as jest.Mock).mockResolvedValue(ranking);
  await walkToLastStep();
  await next();
  await screen.findByText('Your best fits');
  for (const r of ranking.top) {
    expect(screen.getByText(r.name)).toBeTruthy();
    expect(screen.getByText(r.reason)).toBeTruthy();
  }
  expect(screen.getByText('Surprising fits')).toBeTruthy();
  expect(screen.getByText('Philosophy')).toBeTruthy();
  expect(screen.queryByText('What you enjoy 80 × 30%')).toBeNull();
  await fireEvent.press(screen.getByTestId('why-political-science'));
  expect(screen.getByText('What you enjoy 80 × 30%')).toBeTruthy();
  expect(screen.getByText('Your degree 50 × 20%')).toBeTruthy();
  expect(screen.getByText('Steady results 30 × 5%')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('fit-geography'));
  expect(router.push).toHaveBeenCalledWith('/optionals/geography');
  await fireEvent.press(screen.getByText('Compare the top three'));
  expect(router.push).toHaveBeenCalledWith(
    '/optionals/compare?slugs=political-science,geography,sociology',
  );
});

test('view=results re-opens the ranking through api.fits without calling fitQuiz', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ view: 'results' });
  let resolve: (v: typeof ranking) => void = () => undefined;
  (api.fits as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
  await render(<Quiz />);
  expect(screen.getByTestId('skeleton')).toBeTruthy();
  resolve(ranking);
  await screen.findByText('Your best fits');
  expect(api.fits).toHaveBeenCalledTimes(1);
  expect(api.fitQuiz).not.toHaveBeenCalled();
  expect(screen.getByText('Geography')).toBeTruthy();
});

test('view=results falls back to the first question on 404', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ view: 'results' });
  (api.fits as jest.Mock).mockRejectedValue({ status: 404 });
  await render(<Quiz />);
  await screen.findByText('Your degree');
});

test('a failed submit shows the error copy and keeps the answers', async () => {
  (api.fitQuiz as jest.Mock).mockRejectedValueOnce(new Error('network'));
  await walkToLastStep();
  await next();
  await screen.findByText("Couldn't reach the library. Try again.");
  expect(screen.getByText('Your risk')).toBeTruthy();
  (api.fitQuiz as jest.Mock).mockResolvedValue(ranking);
  await fireEvent.press(screen.getByText('Try again'));
  await screen.findByText('Your best fits');
  expect(api.fitQuiz).toHaveBeenCalledTimes(2);
  expect((api.fitQuiz as jest.Mock).mock.calls[1][0]).toMatchObject({
    background: 'engineering',
    hours: 500,
    risk: 0.8,
  });
});
