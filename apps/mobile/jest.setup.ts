/* eslint-disable */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { apiUrl: 'https://api.test', googleWebClientId: 'web-id', devTools: false },
    },
  },
}));
