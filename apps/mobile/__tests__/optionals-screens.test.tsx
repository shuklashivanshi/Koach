import type { OptionalExplorer } from '@koach/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/api/client';
import Explorer from '@/app/optionals/[slug]';
import Optionals from '@/app/optionals';

jest.mock('@/api/client', () => ({
  api: {
    optional: jest.fn(),
    optionals: jest.fn(),
    decision: jest.fn(),
    chooseOptional: jest.fn(),
  },
}));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('@/app/onboarding', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Chip: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const explorer = (over: Partial<OptionalExplorer> = {}): OptionalExplorer => ({
  slug: 'political-science',
  name: 'Political Science and IR',
  summary: 'Theory and world politics.',
  hours: 380,
  topics: ['Political theory', 'Comparative politics'],
  gsOverlap: 0.42,
  overlapsWith: ['Polity', 'International Relations'],
  books: ['Political Theory by Rajeev Bhargava'],
  materials: 0.9,
  answerStyle: { analytical: 0.8, factual: 0.5, diagrams: 0.1, numericals: 0.05 },
  success: {
    appeared: 3000,
    recommended: 243,
    rate: 0.081,
    low: 0.072,
    high: 0.091,
    years: 2,
    smallSample: false,
  },
  years: [
    { examYear: 2022, appeared: 1500, recommended: 110 },
    { examYear: 2023, appeared: 1500, recommended: 133 },
  ],
  sources: [],
  fit: {
    score: 0.8,
    components: { interest: 0.8, overlap: 0.4 },
    reason: 'Strong match on what you enjoy.',
    surprising: false,
  },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ slug: 'political-science' });
});

test('explorer shows the Stat row, band chart, your fit and the estimated-style caption', async () => {
  (api.optional as jest.Mock).mockResolvedValue(explorer());
  await render(<Explorer />);
  await screen.findByText('Political Science and IR');
  expect(screen.getByLabelText('~380 HRS')).toBeTruthy();
  expect(screen.getByLabelText('42% GS overlap')).toBeTruthy();
  expect(screen.getByLabelText('8.1% Success')).toBeTruthy();
  expect(screen.getByText('2022: 110 of 1,500 (7.3%)')).toBeTruthy();
  expect(screen.getByText('Pooled 8.1% (7.2%-9.1%)')).toBeTruthy();
  expect(screen.queryByText('Few candidates')).toBeNull();
  expect(screen.getByText('Strong match on what you enjoy.')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('why-fit'));
  expect(screen.getByText('What you enjoy · 80 of 100')).toBeTruthy();
  expect(screen.getByText('Estimated from the syllabus, not from past papers')).toBeTruthy();
  expect(screen.getByText('Political Theory by Rajeev Bhargava')).toBeTruthy();
  await fireEvent.press(screen.getByText('Compare'));
  expect(router.push).toHaveBeenCalledWith('/optionals?compare=political-science');
});

test('explorer flags a small sample, shows no fit before the quiz, and handles no rows', async () => {
  (api.optional as jest.Mock).mockResolvedValue(
    explorer({
      fit: null,
      success: {
        appeared: 60,
        recommended: 6,
        rate: 0.1,
        low: 0.05,
        high: 0.2,
        years: 2,
        smallSample: true,
      },
    }),
  );
  await render(<Explorer />);
  await screen.findByText('Few candidates');
  await fireEvent.press(screen.getByText('Take the fit quiz'));
  expect(router.push).toHaveBeenCalledWith('/optionals/quiz');
});

test('explorer with no rows says so, and a failed load offers Try again', async () => {
  (api.optional as jest.Mock).mockResolvedValueOnce(
    explorer({
      years: [],
      success: {
        appeared: 0,
        recommended: 0,
        rate: null,
        low: null,
        high: null,
        years: 0,
        smallSample: true,
      },
    }),
  );
  await render(<Explorer />);
  await screen.findByText('No candidates in the years read');
  expect(screen.getByLabelText('— Success')).toBeTruthy();
});

test('explorer failure shows the error copy and Try again reloads', async () => {
  (api.optional as jest.Mock).mockRejectedValueOnce(new Error('network'));
  await render(<Explorer />);
  await screen.findByText("Couldn't reach the library. Try again.");
  (api.optional as jest.Mock).mockResolvedValue(explorer());
  await fireEvent.press(screen.getByText('Try again'));
  await screen.findByText('Political Science and IR');
});

test('optionals home: skeleton while loading, then rows, Your fits after a quiz, compare preselect', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ compare: 'sociology' });
  let resolve: (v: unknown) => void = () => undefined;
  (api.optionals as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
  (api.decision as jest.Mock).mockResolvedValue({
    deadline: '2026-12-15',
    daysLeft: 38,
    chosen: null,
    reasons: null,
    quizTaken: true,
  });
  await render(<Optionals />);
  expect(screen.getByTestId('skeleton')).toBeTruthy();
  const success = {
    appeared: 0,
    recommended: 0,
    rate: null,
    low: null,
    high: null,
    years: 0,
    smallSample: true,
  };
  resolve({
    optionals: [
      { slug: 'sociology', name: 'Sociology', summary: '', success },
      { slug: 'geography', name: 'Geography', summary: '', success },
    ],
  });
  await screen.findByText('Sociology');
  expect(screen.getAllByText('No candidates in the years read').length).toBe(2);
  await fireEvent.press(screen.getByText('Your fits'));
  expect(router.push).toHaveBeenCalledWith('/optionals/quiz?view=results');
});

test('optionals home failure shows the error copy', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (api.optionals as jest.Mock).mockRejectedValue(new Error('network'));
  (api.decision as jest.Mock).mockRejectedValue(new Error('network'));
  await render(<Optionals />);
  await screen.findByText("Couldn't reach the library. Try again.");
  expect(screen.getByText('Try again')).toBeTruthy();
});
