import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Design is light-only (capy-ui has no dark tokens).
const CapyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    primary: '#823D00',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={CapyTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="session-setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="stats" />
        <Stack.Screen name="iap" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
