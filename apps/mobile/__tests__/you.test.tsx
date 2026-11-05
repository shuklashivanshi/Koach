import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { api } from '@/api/client';
import { signOut } from '@/auth/firebase';
import { shareJson } from '@/files';
import You from '@/app/(tabs)/you';

jest.mock('@/auth/firebase', () => ({ signOut: jest.fn() }));
jest.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'signed-in', user: { uid: 'u1', email: 'a@b.co' } }),
}));
jest.mock('@/api/client', () => ({
  api: { exportData: jest.fn(), deleteAccount: jest.fn(), aiPing: jest.fn() },
}));
jest.mock('@/files', () => ({ shareJson: jest.fn(), cacheAudio: jest.fn() }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>redirect:{href}</Text>;
  },
}));

beforeEach(() => jest.clearAllMocks());

test('Export data shares the JSON bundle', async () => {
  const bundle = { user: { uid: 'u1' } };
  (api.exportData as jest.Mock).mockResolvedValue(bundle);
  await render(<You />);
  await fireEvent.press(screen.getByText('Export data'));
  await waitFor(() => expect(shareJson).toHaveBeenCalledWith('koach-export.json', bundle));
});

test('Delete account requires confirmation, then deletes and signs out', async () => {
  (api.deleteAccount as jest.Mock).mockResolvedValue(undefined);
  await render(<You />);
  await fireEvent.press(screen.getByText('Delete account'));
  expect(
    screen.getByText("This erases your plan, notes and history. It can't be undone."),
  ).toBeTruthy();
  expect(api.deleteAccount).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('confirm-delete'));
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  expect(api.deleteAccount).toHaveBeenCalledTimes(1);
});

test('Keep closes the sheet without deleting', async () => {
  await render(<You />);
  await fireEvent.press(screen.getByText('Delete account'));
  await fireEvent.press(screen.getByTestId('keep'));
  expect(api.deleteAccount).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
});
