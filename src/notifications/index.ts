import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local-only: this schedules a device notification for when the current
 * run's total remaining time elapses, so the user is told the session
 * finished even if the app is backgrounded. It does not touch push tokens —
 * remote push isn't part of this feature and (as of SDK 53+) isn't
 * available in Expo Go anyway.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelReady: Promise<void> | null = null;

/** Android requires a channel before a notification with sound will post. */
function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync('session-complete', {
      name: 'Session complete',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).then(() => undefined);
  }
  return channelReady;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain === false) return false;

  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

export async function scheduleSessionNotification(remainingMs: number): Promise<string | null> {
  try {
    await ensureAndroidChannel();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Session complete!',
        body: 'Your capybara did it — come see your reward.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(remainingMs / 1000)),
        repeats: false,
      },
    });
  } catch (error) {
    // A failed schedule should never block starting or resuming a session.
    console.warn('[notifications] schedule failed', error);
    return null;
  }
}

export async function cancelSessionNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or already cancelled — nothing to do.
  }
}
