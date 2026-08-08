import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { ANDROID_SNAPSHOT_KEY, ANDROID_WIDGET_NAMES, APP_GROUP } from './config';
import type { WidgetSnapshot } from './snapshot';

/**
 * Pushes the latest run/plan state to whichever native widget surface exists
 * on this platform. Safe to call unconditionally, including under Expo Go
 * and on web — neither native piece is present there, and both platforms'
 * failure modes are handled below.
 */
export async function pushWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (Platform.OS === 'ios') {
    pushToIOS(snapshot);
  } else if (Platform.OS === 'android') {
    await pushToAndroid(snapshot);
  }
}

function pushToIOS(snapshot: WidgetSnapshot): void {
  try {
    // @bacons/apple-targets' ExtensionStorage never throws — it falls back
    // to no-op stubs when the native module isn't linked (Expo Go) — but the
    // require stays lazy and try/catch-guarded anyway, for symmetry with the
    // Android branch and in case a future version changes that contract.
    const { ExtensionStorage } = require('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('snapshot', JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget();
  } catch (error) {
    console.warn('[widgets] iOS snapshot push failed', error);
  }
}

async function pushToAndroid(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(ANDROID_SNAPSHOT_KEY, JSON.stringify(snapshot));

    // react-native-android-widget's native module uses
    // TurboModuleRegistry.getEnforcing, which throws the instant it's
    // imported if unlinked — as it is in Expo Go, on both platforms. A
    // static top-of-file `import` would execute that throw at app startup
    // regardless of this try/catch, since Metro evaluates imports before
    // any surrounding runtime code runs. The `require` must stay right here,
    // deferred until this line actually executes.
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { renderClockWidget } = require('./android/render');

    await requestWidgetUpdate({
      widgetName: ANDROID_WIDGET_NAMES.clock,
      renderWidget: () => renderClockWidget(snapshot),
    });
  } catch (error) {
    console.warn('[widgets] Android snapshot push failed', error);
  }
}
