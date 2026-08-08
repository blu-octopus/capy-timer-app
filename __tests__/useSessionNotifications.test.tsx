/**
 * One notification per remaining phase boundary, timed from the run's
 * anchor. These tests drive the store directly (the same pattern as
 * timer.test.ts) and assert against the mocked expo-notifications calls in
 * jest.setup.js. Date.now is pinned so anchor-based trigger math is exact.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useSessionNotifications } from '@/hooks/useSessionNotifications';
import { useAppStore } from '@/src/store';
import { buildSchedule, type SessionPlan } from '@/src/store/types';

jest.mock('@/src/db/sessions', () => ({
  recordSession: jest.fn().mockResolvedValue(undefined),
  newSessionId: jest.fn(() => 'ses_test'),
}));

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

let nowSpy: jest.SpyInstance<number, []>;

function setNow(ts: number) {
  nowSpy.mockReturnValue(ts);
}

function setup() {
  useAppStore.setState({
    plan,
    status: 'idle',
    elapsedMs: 0,
    schedule: [],
    coinsAwarded: 0,
    skipped: false,
    skippedFocusMs: 0,
    skippedBreakMs: 0,
  });
}

function scheduledCalls() {
  return (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
}

function scheduledSeconds(): number[] {
  return scheduledCalls().map((call) => call[0].trigger.seconds);
}

function scheduledTitles(): string[] {
  return scheduledCalls().map((call) => call[0].content.title);
}

beforeEach(() => {
  jest.clearAllMocks();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
  setup();
});

afterEach(() => {
  nowSpy.mockRestore();
});

describe('useSessionNotifications', () => {
  it('schedules every phase boundary on start, ending with completion', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });

    await waitFor(() => expect(scheduledCalls()).toHaveLength(4));
    // Boundaries of a 20/10 × 2 plan: minutes 20, 30, 50, 60.
    expect(scheduledSeconds()).toEqual([20 * 60, 30 * 60, 50 * 60, 60 * 60]);
    expect(scheduledTitles()).toEqual([
      'Focus complete — break time!',
      "Break's over — back to focus",
      'Focus complete — break time!',
      'Session complete!',
    ]);
  });

  it('cancels everything while paused and reschedules shifted boundaries on resume', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });
    await waitFor(() => expect(scheduledCalls()).toHaveLength(4));

    setNow(T0 + 10 * MIN);
    act(() => {
      useAppStore.getState().pause(T0 + 10 * MIN);
    });
    await waitFor(() =>
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(4),
    );
    expect(scheduledCalls()).toHaveLength(4);

    act(() => {
      useAppStore.getState().resume(T0 + 10 * MIN);
    });
    await waitFor(() => expect(scheduledCalls()).toHaveLength(8));
    // Ten minutes gone: boundaries now land at 10, 20, 40, 50 minutes out.
    expect(scheduledSeconds().slice(4)).toEqual([10 * 60, 20 * 60, 40 * 60, 50 * 60]);
  });

  it('reschedules only the boundaries still ahead after a skip', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });
    await waitFor(() => expect(scheduledCalls()).toHaveLength(4));

    setNow(T0 + 5 * MIN);
    act(() => {
      useAppStore.getState().tick(T0 + 5 * MIN);
      useAppStore.getState().skipPhase(T0 + 5 * MIN);
    });

    // Skipping to the break leaves boundaries at 10, 30 and 40 minutes out.
    await waitFor(() => expect(scheduledCalls()).toHaveLength(7));
    expect(scheduledSeconds().slice(4)).toEqual([10 * 60, 30 * 60, 40 * 60]);
    expect(scheduledTitles()[6]).toBe('Session complete!');
  });

  it('cancels and does not reschedule once the run ends', async () => {
    renderHook(() => useSessionNotifications());

    act(() => {
      useAppStore.getState().startRun(T0);
    });
    await waitFor(() => expect(scheduledCalls()).toHaveLength(4));

    act(() => {
      useAppStore.getState().endRun(T0 + 5 * MIN);
    });

    await waitFor(() =>
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(4),
    );
    expect(scheduledCalls()).toHaveLength(4);
  });

  it('schedules only future boundaries for a rehydrated mid-run session', async () => {
    // Cold start: persisted run state reappears with the clock 25 minutes in.
    setNow(T0 + 25 * MIN);
    useAppStore.setState({
      status: 'running',
      schedule: buildSchedule(plan),
      anchorTs: T0,
      startedAt: T0,
    });

    renderHook(() => useSessionNotifications());

    // Minute-20 boundary is in the past; only 30, 50 and 60 get scheduled.
    await waitFor(() => expect(scheduledCalls()).toHaveLength(3));
    expect(scheduledSeconds()).toEqual([5 * 60, 25 * 60, 35 * 60]);
    expect(scheduledTitles()).toEqual([
      "Break's over — back to focus",
      'Focus complete — break time!',
      'Session complete!',
    ]);
  });

  it('never schedules anything while idle', async () => {
    renderHook(() => useSessionNotifications());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
