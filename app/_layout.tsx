import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    // Inter font family
    'Inter_18pt-Regular': require('../assets/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    'Inter_18pt-Medium': require('../assets/fonts/Inter/static/Inter_18pt-Medium.ttf'),
    'Inter_18pt-SemiBold': require('../assets/fonts/Inter/static/Inter_18pt-SemiBold.ttf'),
    'Inter_18pt-Bold': require('../assets/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    'Inter_18pt-Light': require('../assets/fonts/Inter/static/Inter_18pt-Light.ttf'),
    
    // Keep SpaceMono for fallback
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
