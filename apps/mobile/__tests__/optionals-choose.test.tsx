import type { OptionalOutline } from '@koach/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '@/api/client';
import Outline from '@/app/optionals/outline';
import { ChooseSheet } from '@/optionals/ChooseSheet';
import { localIsoDate } from '@/optionals/format';

jest.mock('@/api/client', () => ({
  api: { chooseOptional: jest.fn(), outline: jest.fn(), decision: jest.fn() },
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

const m = (f: unknown) => f as jest.Mock;
const isoPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
};
const result = (over: Record<string, unknown> = {}) => ({
  deadline: '2026-12-15',
  daysLeft: 10,
  chosen: 'sociology',
  reasons: 'I like it',
  quizTaken: true,
  startsOn: isoPlus(1),
  pausedForPrelims: false,
  ...over,
});
const reasonsField = () => screen.getByPlaceholderText('Why this optional, in your words');

beforeEach(() => jest.clearAllMocks());

describe('ChooseSheet', () => {
  const sheet = (over: Partial<React.ComponentProps<typeof ChooseSheet>> = {}) => (
    <ChooseSheet
      visible
      slug="sociology"
      name="Sociology"
      current={null}
      onClose={jest.fn()}
      onChosen={jest.fn()}
      {...over}
    />
  );

  test('the primary stays disabled until the reasons have 3 characters', async () => {
    await render(sheet());
    const start = screen.getByTestId('choose-start');
    expect(start).toBeDisabled();
    await fireEvent.changeText(reasonsField(), 'ab');
    expect(screen.getByTestId('choose-start')).toBeDisabled();
    await fireEvent.changeText(reasonsField(), 'abc');
    expect(screen.getByTestId('choose-start')).toBeEnabled();
  });

  test('step 2 asks to confirm; Keep looking goes back without calling the API', async () => {
    await render(sheet());
    await fireEvent.changeText(reasonsField(), 'I enjoy it');
    await fireEvent.press(screen.getByTestId('choose-start'));
    expect(screen.getByText('Choose Sociology?')).toBeTruthy();
    expect(screen.queryByText(/This replaces/)).toBeNull();
    await fireEvent.press(screen.getByText('Keep looking'));
    expect(api.chooseOptional).not.toHaveBeenCalled();
    expect(screen.getByTestId('choose-start')).toBeTruthy();
    expect(reasonsField().props.value).toBe('I enjoy it');
  });

  test('changing optional names the one it replaces', async () => {
    await render(sheet({ current: { chosen: 'geography', reasons: 'x', name: 'Geography' } }));
    await fireEvent.changeText(reasonsField(), 'I enjoy it');
    await fireEvent.press(screen.getByTestId('choose-start'));
    expect(screen.getByText('This replaces Geography.')).toBeTruthy();
  });

  test('confirming saves once and says it joins from tomorrow', async () => {
    const onChosen = jest.fn();
    m(api.chooseOptional).mockResolvedValue(result());
    await render(sheet({ onChosen }));
    await fireEvent.changeText(reasonsField(), 'I enjoy it');
    await fireEvent.press(screen.getByTestId('choose-start'));
    await fireEvent.press(screen.getByTestId('choose-confirm'));
    expect(await screen.findByText('Added to your plan.')).toBeTruthy();
    expect(api.chooseOptional).toHaveBeenCalledTimes(1);
    expect(api.chooseOptional).toHaveBeenCalledWith('sociology', 'I enjoy it');
    expect(screen.getByText('It joins your plan from tomorrow.')).toBeTruthy();
    expect(screen.queryByText('Optional study resumes after Prelims.')).toBeNull();
    expect(onChosen).toHaveBeenCalledWith(expect.objectContaining({ chosen: 'sociology' }));
  });

  test('today wording and the Prelims pause line', async () => {
    m(api.chooseOptional).mockResolvedValue(
      result({ startsOn: isoPlus(0), pausedForPrelims: true }),
    );
    await render(sheet());
    await fireEvent.changeText(reasonsField(), 'I enjoy it');
    await fireEvent.press(screen.getByTestId('choose-start'));
    await fireEvent.press(screen.getByTestId('choose-confirm'));
    expect(await screen.findByText('It joins your plan from today.')).toBeTruthy();
    expect(screen.getByText('Optional study resumes after Prelims.')).toBeTruthy();
  });

  test('See the outline opens the outline route', async () => {
    const onClose = jest.fn();
    m(api.chooseOptional).mockResolvedValue(result());
    await render(sheet({ onClose }));
    await fireEvent.changeText(reasonsField(), 'I enjoy it');
    await fireEvent.press(screen.getByTestId('choose-start'));
    await fireEvent.press(screen.getByTestId('choose-confirm'));
    await fireEvent.press(await screen.findByText('See the outline'));
    expect(router.push).toHaveBeenCalledWith('/optionals/outline');
    expect(onClose).toHaveBeenCalled();
  });

  test('a failed save shows the error and keeps the reasons', async () => {
    m(api.chooseOptional).mockRejectedValue(new Error('x'));
    await render(sheet());
    await fireEvent.changeText(reasonsField(), 'I enjoy it');
    await fireEvent.press(screen.getByTestId('choose-start'));
    await fireEvent.press(screen.getByTestId('choose-confirm'));
    expect(await screen.findByText("Couldn't reach the library. Try again.")).toBeTruthy();
    expect(screen.queryByText('Added to your plan.')).toBeNull();
    await fireEvent.press(screen.getByText('Keep looking'));
    expect(reasonsField().props.value).toBe('I enjoy it');
  });
});

describe('Outline', () => {
  const outline = (over: Partial<OptionalOutline> = {}): OptionalOutline => ({
    slug: 'sociology',
    name: 'Sociology',
    firstPassHours: 380,
    plannedHours: 4.5,
    studied: 1,
    paused: false,
    units: [
      {
        nodeId: 'optional:sociology:1:a',
        title: 'Sociology as a discipline',
        paper: 'I',
        minutes: 90,
        status: 'studied',
        scheduledOn: null,
      },
      {
        nodeId: 'optional:sociology:1:b',
        title: 'Work and economic life',
        paper: 'I',
        minutes: 90,
        status: 'todo',
        scheduledOn: '2026-11-09',
      },
      {
        nodeId: 'optional:sociology:2:c',
        title: 'Rural change',
        paper: 'II',
        minutes: 90,
        status: 'todo',
        scheduledOn: null,
      },
    ],
    ...over,
  });

  beforeEach(() => {
    m(api.decision).mockResolvedValue(result());
  });

  test('shows the stats, paper groups, states and planned days', async () => {
    m(api.outline).mockResolvedValue(outline());
    await render(<Outline />);
    expect(await screen.findByText('Sociology')).toBeTruthy();
    expect(screen.getByText('I like it')).toBeTruthy();
    expect(screen.getByLabelText('3 Units')).toBeTruthy();
    expect(screen.getByLabelText('1 Studied')).toBeTruthy();
    expect(screen.getByLabelText('~380 First pass hrs')).toBeTruthy();
    expect(screen.getByText(/Each unit is a 90-minute Learn task/)).toBeTruthy();
    expect(screen.getByText(/A full first pass is about 380 hours/)).toBeTruthy();
    expect(screen.getByText('Paper I')).toBeTruthy();
    expect(screen.getByText('Paper II')).toBeTruthy();
    expect(screen.getByText('90 min · Studied')).toBeTruthy();
    expect(screen.getByText('90 min · Planned Mon 9 Nov')).toBeTruthy();
    expect(screen.queryByText('Paused until Prelims is over.')).toBeNull();
  });

  test('shows the pause notice when paused', async () => {
    m(api.outline).mockResolvedValue(outline({ paused: true }));
    await render(<Outline />);
    expect(await screen.findByText('Paused until Prelims is over.')).toBeTruthy();
  });

  test('tapping a unit opens its Learn session', async () => {
    m(api.outline).mockResolvedValue(outline());
    await render(<Outline />);
    await fireEvent.press(await screen.findByLabelText(/Work and economic life/));
    expect(router.push).toHaveBeenCalledWith(
      `/learn/${encodeURIComponent('optional:sociology:1:b')}`,
    );
  });

  test('with no optional chosen it says so and links to the optionals', async () => {
    m(api.outline).mockResolvedValue(null);
    await render(<Outline />);
    expect(await screen.findByText('No optional chosen yet.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Choose your optional'));
    expect(router.push).toHaveBeenCalledWith('/optionals');
  });

  test('a failure shows the generic error with Try again', async () => {
    m(api.outline).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(outline());
    await render(<Outline />);
    expect(await screen.findByText("Couldn't reach the library. Try again.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Paper I')).toBeTruthy());
  });
});
