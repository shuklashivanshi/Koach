import { render, screen } from '@testing-library/react-native';
import Dev from '@/app/dev';

// The dev screen is gated by appConfig.devTools, which is false outside dev builds.
jest.mock('@/config', () => ({ appConfig: { apiUrl: 'https://api.test', devTools: false } }));
jest.mock('@/api/client', () => ({ api: { aiPing: jest.fn() } }));
jest.mock('@/files', () => ({ cacheAudio: jest.fn() }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>redirect:{href}</Text>;
  },
}));

test('the Dev screen is unreachable outside dev builds', async () => {
  await render(<Dev />);
  expect(screen.getByText('redirect:/today')).toBeTruthy();
  expect(screen.queryByText('Ping AI')).toBeNull();
});
