import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  googleWebClientId?: string;
  devTools?: boolean;
};

export const appConfig = {
  apiUrl: (extra.apiUrl ?? '').replace(/\/$/, ''),
  googleWebClientId: extra.googleWebClientId ?? '',
  /** Dev screen is available only in dev builds (D-03). */
  devTools: __DEV__ || extra.devTools === true,
};
