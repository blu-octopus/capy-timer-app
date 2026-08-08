/**
 * The scheduled notification must always describe when the *whole run*
 * will finish, not just the current phase, since navigation to the
 * completion screen only happens once. These tests drive the store directly
 * (the same pattern as timer.test.ts) and assert against the mocked
 * expo-notifications calls in jest.setup.js.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useSessionNotifications } from '@/hooks/useSessionNotifications';
import { useAppStore } from '@/src/store';
import type { SessionPlan } from '@/src/store/types';

const MIN = 60 * 1000;
const T0 = 1_800_000_000_000;

const plan: SessionPlan = {
  focusMin: 20,
  breakMin: 10,
  loops: 2,
  prepEnabled: false,
  countDirection: 'down',
  companionId: 'basic',
};

function setup() {
  useAppStore.setState({
    plan,
    status: 'idle',
    elapsedMs: 0,
    schedule: [],
    coinsAwarded: 0,
    skipped: false,
  });
}

function lastScheduledSeconds(): number {
  const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
  return calls[calls.length - 1]![0].trigger.seconds;
}

beforeEach(() => {
  jest.clearAllMocks();
  setup();
});

describe('useSessionNotifications', () => {
  it('schedules a notification for the full run duration on start', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });

    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));
    // (20 + 10) * 2 loops = 60 minutes.
    expect(lastScheduledSeconds()).toBe(60 * 60);
  });

  it('cancels the notification while paused and reschedules a shorter one on resume', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));

    act(() => {
      useAppStore.getState().pause(T0 + 10 * MIN);
    });
    await waitFor(() =>
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'mock-notification-id',
      ),
    );

    act(() => {
      useAppStore.getState().resume(T0 + 10 * MIN);
    });
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2));
    // 60 min total minus the 10 already elapsed before pausing.
    expect(lastScheduledSeconds()).toBe(50 * 60);
  });

  it('reschedules for the shorter remaining time after a skip', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));

    act(() => {
      useAppStore.getState().tick(T0 + 5 * MIN);
      useAppStore.getState().skipPhase(T0 + 5 * MIN);
    });

    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2));
    // Skipping from minute 5 straight to the break boundary (minute 20) leaves 40 min.
    expect(lastScheduledSeconds()).toBe(40 * 60);
  });

  it('cancels and does not reschedule once the run ends', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));

    act(() => {
      useAppStore.getState().endRun(T0 + 5 * MIN);
    });

    await waitFor(() => expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled());
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('never schedules anything while idle', async () => {
    renderHook(() => useSessionNotifications());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
