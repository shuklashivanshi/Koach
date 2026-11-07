/* eslint-disable */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
// expo-audio needs its native module; screens that import the shared answer Field only need it
// to exist. Tests that exercise audio mock it themselves.
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { apiUrl: 'https://api.test', googleWebClientId: 'web-id', devTools: false },
    },
  },
}));
