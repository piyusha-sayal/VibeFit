import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useAuthStore } from '../store/authStore';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

/**
 * How long to wait for bundled fonts before starting without them.
 *
 * They load from the binary, so a second is already generous; anything longer
 * means a failure that waiting will not fix.
 */
const FONT_TIMEOUT_MS = 3_000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
    mutations: { retry: 0 },
  },
});

/** Inside the provider, so the whole shell repaints when the theme changes. */
function ThemedStack() {
  const { colors, name, reducedMotion } = useTheme();
  const fade = reducedMotion ? 'none' : 'fade';
  const push = reducedMotion ? 'none' : 'slide_from_right';

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {/* First screen = initial route on native cold start (no deep-link path).
            Without it the Stack opened (auth)/login and skipped the session check. */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: fade }} />
        <Stack.Screen name="(tabs)" options={{ animation: fade }} />
        <Stack.Screen name="analysis" options={{ animation: push }} />
        <Stack.Screen name="colors" options={{ animation: push }} />
        <Stack.Screen name="style" options={{ animation: push }} />
        <Stack.Screen name="settings" options={{ animation: push }} />
        <Stack.Screen name="plan" options={{ animation: push }} />
        <Stack.Screen name="vibe-profile" options={{ animation: push }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  // The error half of this was being thrown away. When a face failed to load,
  // `fontsLoaded` stayed false for ever, the component returned null for ever,
  // and `hideAsync` was never reached — so the splash stayed on screen with no
  // buttons on it. Reported as: black screen, "Find what fits you", no skip, no
  // way forward. There was no way forward; nothing was mounted behind it.
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const restoreSession = useAuthStore((s) => s.restoreSession);
  const [fontsGaveUp, setFontsGaveUp] = useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  /**
   * Fonts are bundled in the binary, so this should be near-instant. When it
   * is not, something has gone wrong that waiting will not repair.
   */
  useEffect(() => {
    if (fontsLoaded || fontError) return undefined;
    const giveUp = setTimeout(() => setFontsGaveUp(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(giveUp);
  }, [fontsLoaded, fontError]);

  // The app renders once the fonts are ready, or once it is clear they are not
  // coming. A screen in the wrong typeface is a cosmetic fault; a screen that
  // never appears is a dead application.
  const ready = fontsLoaded || Boolean(fontError) || fontsGaveUp;

  useEffect(() => {
    // Hiding the splash is what hands the screen to the app, so it must happen
    // on every path out of the wait, not only the happy one.
    if (ready) SplashScreen.hideAsync().catch(() => { /* already hidden */ });
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
