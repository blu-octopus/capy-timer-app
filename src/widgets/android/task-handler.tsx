/**
 * Registered only from the guarded require in the project's index.js —
 * never imported by the normal app bundle. See bridge.ts for why a static
 * top-level import of react-native-android-widget anywhere reachable from
 * app startup would crash Expo Go.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { ANDROID_SNAPSHOT_KEY, ANDROID_WIDGET_NAMES } from '@/src/widgets/config';
import type { WidgetSnapshot } from '@/src/widgets/snapshot';
import { renderBatteryWidget, renderClockWidget } from './render';

const RENDER_TRIGGERS: WidgetTaskHandlerProps['widgetAction'][] = [
  'WIDGET_ADDED',
  'WIDGET_UPDATE',
  'WIDGET_RESIZED',
];

async function handleBatteryWidget({ renderWidget }: WidgetTaskHandlerProps) {
  // expo-battery is a first-party Expo SDK module — unlike the widget
  // library itself, it's present in Expo Go and needs no availability
  // guard. -1 means the device doesn't report a level (rare; iOS simulators
  // are the common case).
  const level = await Battery.getBatteryLevelAsync();
  renderWidget(renderBatteryWidget(level >= 0 ? Math.round(level * 100) : null));
}

async function handleClockWidget({ renderWidget }: WidgetTaskHandlerProps) {
  const raw = await AsyncStorage.getItem(ANDROID_SNAPSHOT_KEY);
  const snapshot: WidgetSnapshot | null = raw ? JSON.parse(raw) : null;

  renderWidget(
    renderClockWidget(
      snapshot ?? {
        status: 'idle',
        phase: null,
        phaseLabel: 'Ready to focus',
        loopIndex: 0,
        totalLoops: 1,
        companionId: 'basic',
        phaseEndAt: null,
        updatedAt: Date.now(),
      },
    ),
  );
}

registerWidgetTaskHandler(async (props) => {
  if (!RENDER_TRIGGERS.includes(props.widgetAction)) return;

  if (props.widgetInfo.widgetName === ANDROID_WIDGET_NAMES.battery) {
    await handleBatteryWidget(props);
  } else if (props.widgetInfo.widgetName === ANDROID_WIDGET_NAMES.clock) {
    await handleClockWidget(props);
  }
});
