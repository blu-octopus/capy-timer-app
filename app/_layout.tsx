import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  MPLUSRounded1c_300Light,
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_700Bold,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useWidgetSync } from '@/hooks/useWidgetSync';
import { loadCategories } from '@/src/db/categories';
import { useAppStore } from '@/src/store';
import { colors } from '@/src/theme/tokens';

// Design is light-only (capy-ui has no dark tokens).
const CapyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.white,
    card: colors.white,
    text: colors.black,
    primary: colors.brown,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    MPLUSRounded1c_300Light,
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Categories live in SQLite; hydrate the store cache once at startup.
  useEffect(() => {
    void loadCategories();
  }, []);

  // The persisted `isPremium` carries the last known answer through a cold
  // offline launch; this corrects it (in either direction — expiry as well as
  // purchase) as soon as RevenueCat is reachable.
  useEffect(() => {
    void useAppStore.getState().syncPremium();
  }, []);

  // Mounted at the root, not just the timer screen — widgets must reflect
  // the current run regardless of which screen is on top.
  useWidgetSync();

  if (!loaded) return null;

  return (
    // Required ancestor for every GestureDetector in the app — the session
    // sheet's option wheels are the first thing to need one.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={CapyTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
            <Stack.Screen name="index" />
            {/* A sheet rather than a full screen: the timer stays visible
                behind it, so changing a duration reads as adjusting the
                session you're looking at rather than visiting a settings
                page. formSheet detents are iOS-native and degrade to a
                standard modal elsewhere. */}
            <Stack.Screen
              name="session-setup"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.72, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 28,
              }}
            />
            <Stack.Screen name="stats" />
            <Stack.Screen
              name="iap"
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
            <Stack.Screen name="+not-found" options={{ headerShown: true }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
