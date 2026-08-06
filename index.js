// Custom entry point, replacing the default "expo-router/entry" in
// package.json's "main" field. This is the one safe place to register the
// Android widget task handler: it must run at app startup (before any
// widget action can be handled), but react-native-android-widget's native
// module throws the instant it's imported if unlinked — as it is in Expo
// Go, on both platforms — so the require is deferred and guarded here
// rather than statically imported. See src/widgets/bridge.ts for the full
// explanation of why this can't just be a normal import.
import { Platform } from 'react-native';

import 'expo-router/entry';

if (Platform.OS === 'android') {
  try {
    require('./src/widgets/android/task-handler');
  } catch (error) {
    console.warn('[widgets] Android task handler registration skipped', error);
  }
}
