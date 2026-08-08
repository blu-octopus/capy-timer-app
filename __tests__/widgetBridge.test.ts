/**
 * Neither native widget module exists in Expo Go, on either platform —
 * react-native-android-widget's TurboModule throws the instant it's
 * imported when unlinked, and @bacons/apple-targets' ExtensionStorage
 * degrades to no-ops instead. pushWidgetSnapshot must survive both without
 * ever throwing into its caller (the store-driven sync hook), since a
 * widget push failing is not something that should ever break the timer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';
import * as AndroidWidget from 'react-native-android-widget';

import { pushWidgetSnapshot } from '@/src/widgets/bridge';
import { ANDROID_SNAPSHOT_KEY, APP_GROUP } from '@/src/widgets/config';
import type { WidgetSnapshot } from '@/src/widgets/snapshot';

const snapshot: WidgetSnapshot = {
  status: 'running',
  phase: 'focus',
  phaseLabel: 'Focus Time',
  loopIndex: 0,
  totalLoops: 2,
  companionId: 'basic',
  phaseEndAt: 1_800_000_000_000,
  updatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pushWidgetSnapshot on iOS', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  it('writes the snapshot into the shared App Group and reloads the widget', async () => {
    await pushWidgetSnapshot(snapshot);

    const instances = (ExtensionStorage as unknown as jest.Mock).mock.instances;
    expect(instances).toHaveLength(1);
    expect((ExtensionStorage as unknown as jest.Mock).mock.calls[0]![0]).toBe(APP_GROUP);
    expect(instances[0].set).toHaveBeenCalledWith('snapshot', JSON.stringify(snapshot));
    expect(ExtensionStorage.reloadWidget).toHaveBeenCalled();
  });

  it('never throws even if the native module rejects the call', async () => {
    // Once, not persistently — this must not leak into other tests sharing
    // this same mock across the file.
    (ExtensionStorage.reloadWidget as jest.Mock).mockImplementationOnce(() => {
      throw new Error('native module not linked');
    });

    await expect(pushWidgetSnapshot(snapshot)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      '[widgets] iOS snapshot push failed',
      expect.any(Error),
    );
  });
});

describe('pushWidgetSnapshot on Android', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });

  it('persists the snapshot to AsyncStorage and requests a widget redraw', async () => {
    await pushWidgetSnapshot(snapshot);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ANDROID_SNAPSHOT_KEY,
      JSON.stringify(snapshot),
    );
    expect(AndroidWidget.requestWidgetUpdate).toHaveBeenCalledTimes(1);
    const call = (AndroidWidget.requestWidgetUpdate as jest.Mock).mock.calls[0]![0];
    expect(call.widgetName).toBe('ClockWidget');
  });

  it('never throws when the native module is unlinked, as in Expo Go', async () => {
    (AndroidWidget.requestWidgetUpdate as jest.Mock).mockImplementationOnce(() => {
      throw new Error('AndroidWidget native module cannot be null');
    });

    await expect(pushWidgetSnapshot(snapshot)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      '[widgets] Android snapshot push failed',
      expect.any(Error),
    );
  });

  it('does not throw if AsyncStorage itself fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(pushWidgetSnapshot(snapshot)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('pushWidgetSnapshot on web', () => {
  it('is a no-op — neither platform branch applies', async () => {
    Platform.OS = 'web';

    await pushWidgetSnapshot(snapshot);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AndroidWidget.requestWidgetUpdate).not.toHaveBeenCalled();
    expect(ExtensionStorage.reloadWidget).not.toHaveBeenCalled();
  });
});
