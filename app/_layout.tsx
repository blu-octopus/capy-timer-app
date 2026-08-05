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
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={CapyTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="session-setup" options={{ presentation: 'modal' }} />
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
  );
}
