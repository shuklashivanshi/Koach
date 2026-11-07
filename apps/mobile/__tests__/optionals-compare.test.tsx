import type { OptionalExplorer } from '@koach/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/api/client';
import Compare from '@/app/optionals/compare';

jest.mock('@/api/client', () => ({ api: { compareOptionals: jest.fn() } }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const components = {
  interest: 0.8,
  background: 0.5,
  overlap: 0.4,
  writingStyle: 0.6,
  materials: 0.9,
  time: 0.7,
  stability: 0.3,
};

const opt = (
  slug: string,
  name: string,
  over: Partial<OptionalExplorer> = {},
): OptionalExplorer => ({
  slug,
  name,
  summary: '',
  hours: 400,
  topics: Array.from({ length: 30 }, (_, i) => `Unit ${i}`),
  gsOverlap: 0.3,
  overlapsWith: [],
  books: [],
  materials: 0.6,
  answerStyle: { analytical: 0.5, factual: 0.5, diagrams: 0.1, numericals: 0.1 },
  success: {
    appeared: 2000,
    recommended: 160,
    rate: 0.08,
    low: 0.07,
    high: 0.09,
    years: 6,
    smallSample: false,
  },
  years: [],
  sources: [],
  fit: { score: 0.6, components, reason: 'ok', surprising: false },
  ...over,
});

const three = (): { optionals: OptionalExplorer[] } => ({
  optionals: [
    opt('political-science', 'Political Science and IR', {
      hours: 500,
      gsOverlap: 0.5,
      materials: 0.9,
      success: {
        appeared: 3000,
        recommended: 300,
        rate: 0.1,
        low: 0.09,
        high: 0.11,
        years: 6,
        smallSample: false,
      },
      fit: { score: 0.9, components, reason: 'ok', surprising: false },
    }),
    opt('sociology', 'Sociology', { hours: 400 }),
    opt('kannada-literature', 'Kannada Literature', {
      hours: 300,
      success: {
        appeared: 40,
        recommended: 8,
        rate: 0.2,
        low: 0.1,
        high: 0.35,
        years: 6,
        smallSample: true,
      },
      fit: { score: 0.5, components, reason: 'ok', surprising: false },
    }),
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    slugs: 'political-science,sociology,kannada-literature',
  });
});

test('three optionals render as columns with one row per factor and the best value marked', async () => {
  (api.compareOptionals as jest.Mock).mockResolvedValue(three());
  await render(<Compare />);
  await screen.findByText('Sociology');
  expect(screen.getByText('Political Science and IR')).toBeTruthy();
  expect(screen.getByText('Kannada Literature')).toBeTruthy();
  for (const row of [
    'Hours',
    'Units',
    'GS overlap',
    'Official success',
    'Appeared',
    'Books and papers',
    'Your fit',
  ]) {
    expect(screen.getByText(row)).toBeTruthy();
  }
  // Lowest hours, highest overlap, highest materials, highest fit.
  expect(screen.getByTestId('best-hours-kannada-literature')).toBeTruthy();
  expect(screen.queryByTestId('best-hours-sociology')).toBeNull();
  expect(screen.getByTestId('best-gsOverlap-political-science')).toBeTruthy();
  expect(screen.getByTestId('best-materials-political-science')).toBeTruthy();
  expect(screen.getByTestId('best-fit-political-science')).toBeTruthy();
  // Success is crowned among non-small samples only: Political Science, not Kannada.
  expect(screen.getByTestId('best-success-political-science')).toBeTruthy();
  expect(screen.queryByTestId('best-success-kannada-literature')).toBeNull();
  expect(screen.getByText('few candidates')).toBeTruthy();
});

test('a row where every value is equal shows no best mark', async () => {
  (api.compareOptionals as jest.Mock).mockResolvedValue(three());
  await render(<Compare />);
  await screen.findByText('Sociology');
  // All three have 30 units.
  for (const slug of ['political-science', 'sociology', 'kannada-literature']) {
    expect(screen.queryByTestId(`best-units-${slug}`)).toBeNull();
  }
});

test('a small-sample optional is never marked best on success even when it has the top rate', async () => {
  const data = three();
  data.optionals[0] = {
    ...data.optionals[0]!,
    success: { ...data.optionals[0]!.success, smallSample: true },
  };
  (api.compareOptionals as jest.Mock).mockResolvedValue(data);
  await render(<Compare />);
  await screen.findByText('Sociology');
  // Only Sociology is a non-small sample now, so nobody is crowned.
  for (const slug of ['political-science', 'sociology', 'kannada-literature']) {
    expect(screen.queryByTestId(`best-success-${slug}`)).toBeNull();
  }
});

test('without a quiz, Your fit shows a dash and a text button to take the quiz', async () => {
  const data = three();
  data.optionals = data.optionals.map((o) => ({ ...o, fit: null }));
  (api.compareOptionals as jest.Mock).mockResolvedValue(data);
  await render(<Compare />);
  await screen.findByText('Sociology');
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  await fireEvent.press(screen.getByText('Take the fit quiz'));
  expect(router.push).toHaveBeenCalledWith('/optionals/quiz');
});

test('a failed load shows the error copy and Try again reloads', async () => {
  (api.compareOptionals as jest.Mock).mockRejectedValueOnce(new Error('network'));
  await render(<Compare />);
  await screen.findByText("Couldn't reach the library. Try again.");
  expect(screen.queryByText('Hours')).toBeNull();
  (api.compareOptionals as jest.Mock).mockResolvedValue(three());
  await fireEvent.press(screen.getByText('Try again'));
  await waitFor(() => expect(screen.getByText('Sociology')).toBeTruthy());
  expect(api.compareOptionals).toHaveBeenCalledTimes(2);
});
