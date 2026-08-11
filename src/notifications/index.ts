import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PhaseSegment } from '../store/types';

/**
 * Local-only: schedules one device notification per phase boundary of the
 * current run (focus→break, break→focus, and the final completion), so the
 * user is guided through the whole session even with the app backgrounded.
 * It does not touch push tokens — remote push isn't part of this feature
 * and (as of SDK 53+) isn't available in Expo Go anyway.
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

let askedThisSession = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain === false) return false;
  // One OS prompt per process — phase changes must not re-fire the dialog.
  if (askedThisSession) return false;

  askedThisSession = true;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

/** What to say when `segment` ends and `next` (if any) begins. */
function boundaryContent(
  segment: PhaseSegment,
  next: PhaseSegment | undefined,
): { title: string; body: string } {
  if (!next) {
    return {
      title: 'Session complete!',
      body: 'Your capybara did it — come see your reward.',
    };
  }
  if (next.phase === 'break') {
    return {
      title: 'Focus complete — break time!',
      body: 'Your capybara says stretch those paws.',
    };
  }
  if (segment.phase === 'prep') {
    return {
      title: 'Prep is done — time to focus',
      body: 'Your capybara is settling in to work.',
    };
  }
  if (segment.phase === 'focus' && next.phase === 'focus') {
    return {
      title: 'Loop complete — next focus',
      body: 'Your capybara is ready for another round.',
    };
  }
  return {
    title: "Break's over — back to focus",
    body: 'Your capybara is ready for another round.',
  };
}

/**
 * Schedules one notification per boundary still in the future, measured from
 * the run's anchor so the trigger times are exact regardless of when the
 * last tick happened. Returns the ids scheduled so far even if a call fails
 * partway, so the caller can always cancel what did land. Worst case is
 * 2×9 loops + prep ≈ 19 pending, well under iOS's 64-notification cap.
 */
export async function scheduleRunNotifications(
  schedule: PhaseSegment[],
  anchorTs: number,
  now: number = Date.now(),
): Promise<string[]> {
  const ids: string[] = [];
  try {
    await ensureAndroidChannel();

    for (let i = 0; i < schedule.length; i++) {
      const segment = schedule[i]!;
      const secondsUntil = (anchorTs + segment.offsetMs + segment.durationMs - now) / 1000;
      if (secondsUntil <= 0) continue;

      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { ...boundaryContent(segment, schedule[i + 1]), sound: true },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.round(secondsUntil)),
            repeats: false,
          },
        }),
      );
    }
  } catch (error) {
    // A failed schedule should never block starting or resuming a session.
    console.warn('[notifications] schedule failed', error);
  }
  return ids;
}

export async function cancelRunNotifications(ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Already fired or already cancelled — nothing to do.
    }
  }
}
