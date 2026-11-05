import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { api, setUnauthorizedHandler } from '@/api/client';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import * as fb from '@/auth/firebase';
import Welcome from '@/app/index';
import EmailSignIn from '@/app/sign-in/email';

jest.mock('@/auth/firebase', () => ({
  onUserChanged: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithEmailCodeToken: jest.fn(),
  signOut: jest.fn(),
  currentIdToken: jest.fn(),
}));
jest.mock('@/api/client', () => ({
  api: { emailStart: jest.fn(), emailVerify: jest.fn() },
  setUnauthorizedHandler: jest.fn(),
  ApiError: class extends Error {},
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const mocked = fb as jest.Mocked<typeof fb>;

beforeEach(() => jest.clearAllMocks());

test('Welcome shows the spec copy and signs in with Google', async () => {
  mocked.signInWithGoogle.mockResolvedValue('signed-in');
  await render(<Welcome />);
  expect(screen.getByText('Study, with a quiet mind.')).toBeTruthy();
  expect(screen.getByText('Use email instead')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('google'));
  await waitFor(() => expect(mocked.signInWithGoogle).toHaveBeenCalledTimes(1));
});

test('email code sign-in: start → verify → signInWithCustomToken', async () => {
  (api.emailStart as jest.Mock).mockResolvedValue(undefined);
  (api.emailVerify as jest.Mock).mockResolvedValue({ customToken: 'ct-1' });
  await render(<EmailSignIn />);
  await fireEvent.changeText(screen.getByTestId('email-input'), 'shivanshi@example.com');
  await fireEvent.press(screen.getByTestId('send-code'));
  await screen.findByText('Check your email');
  expect(api.emailStart).toHaveBeenCalledWith('shivanshi@example.com');

  await fireEvent.changeText(screen.getByTestId('code-input'), '123456');
  await fireEvent.press(screen.getByTestId('verify-code'));
  await waitFor(() => expect(mocked.signInWithEmailCodeToken).toHaveBeenCalledWith('ct-1'));
  expect(api.emailVerify).toHaveBeenCalledWith('shivanshi@example.com', '123456');
});

function Status() {
  const auth = useAuth();
  return <Text>{auth.status === 'signed-in' ? `in:${auth.user.uid}` : auth.status}</Text>;
}

test('a persisted session is restored without signing in again', async () => {
  mocked.onUserChanged.mockImplementation((cb) => {
    cb({ uid: 'u1', email: 'a@b.co' });
    return () => {};
  });
  await render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  expect(await screen.findByText('in:u1')).toBeTruthy();
  expect(mocked.signInWithGoogle).not.toHaveBeenCalled();
});

test('a 401 from the API signs the user out', async () => {
  mocked.onUserChanged.mockImplementation(() => () => {});
  await render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  const handler = (setUnauthorizedHandler as jest.Mock).mock.calls[0][0] as () => void;
  await act(() => handler());
  expect(mocked.signOut).toHaveBeenCalledTimes(1);
});
