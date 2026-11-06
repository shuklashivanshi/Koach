import type { ConfigContext, ExpoConfig } from 'expo/config';

// Environment values come from eas.json profiles (EXPO_PUBLIC_*) or a local .env file.
// google-services.json is supplied by EAS as a file env var in cloud builds (never committed).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Koach',
  slug: 'koach',
  owner: 'shuklashivanshi',
  scheme: 'koach',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F5EFE4',
  android: {
    package: 'com.koach.app',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#F5EFE4',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-audio',
    'expo-sharing',
    [
      'expo-splash-screen',
      { backgroundColor: '#F5EFE4', image: './assets/splash-icon.png', imageWidth: 120 },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
  ],
  web: { bundler: 'metro', output: 'single' },
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    devTools: process.env.EXPO_PUBLIC_DEV_TOOLS === '1',
    eas: { projectId: '8e6f4cff-857f-4953-8307-da5ea6c694aa' },
    ...(config.extra ?? {}),
  },
});
