import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { fontAssets } from '@/ui/fonts';
import { useTheme } from '@/ui/useTheme';

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const auth = useAuth();
  const { c } = useTheme();
  const [fontsLoaded] = useFonts(fontAssets);
  const ready = fontsLoaded && auth.status !== 'loading';
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Web: the protected-stack redirect lands on the bare "/(tabs)" group URL, which has no page.
  // Keep the address bar on a real path for each sign-in state.
  useEffect(() => {
    if (Platform.OS !== 'web' || auth.status === 'loading') return;
    const publicPath = pathname === '/' || pathname.startsWith('/sign-in');
    if (auth.status === 'signed-in' && (publicPath || pathname === '/(tabs)')) {
      router.replace('/today');
    } else if (auth.status === 'signed-out' && !publicPath) {
      router.replace('/');
    }
  }, [auth.status, pathname, router]);
  if (!ready) return null;

  const signedIn = auth.status === 'signed-in';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.parchment } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in/email" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dev" />
        <Stack.Screen name="admin/review" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="lpt" />
        <Stack.Screen name="learn/[nodeId]" />
        <Stack.Screen name="practice/[nodeId]" />
        <Stack.Screen name="revise" />
        <Stack.Screen name="mistakes" />
        <Stack.Screen name="ca" />
        <Stack.Screen name="library" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="stick/[nodeId]" />
        <Stack.Screen name="palace" />
        <Stack.Screen name="playlist" />
        <Stack.Screen name="optionals/index" />
        <Stack.Screen name="optionals/quiz" />
        <Stack.Screen name="optionals/[slug]" />
        <Stack.Screen name="optionals/compare" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
