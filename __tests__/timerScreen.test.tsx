/**
 * Screen-level checks for the running-state subheading and the coin math it
 * sits next to. The store-level coin math itself is covered by
 * timer.test.ts; this file is about what actually reaches the screen.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import TimerScreen from '@/app/index';
import { useAppStore } from '@/src/store';
import type { Companion } from '@/src/store/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const mockDeniedFeedback = jest.fn();
const mockUnlockFeedback = jest.fn();
jest.mock('@/src/feedback', () => ({
  ...jest.requireActual('@/src/feedback'),
  deniedFeedback: () => mockDeniedFeedback(),
  unlockFeedback: () => mockUnlockFeedback(),
}));

const COMPANIONS: Companion[] = [
  { id: 'basic', name: 'Basic Capy', unlocked: true, priceCoins: 0 },
  { id: 'egg', name: 'Egg Capy', unlocked: false, priceCoins: 500 },
];
const T0 = 1_800_000_000_000;
const MIN = 60 * 1000;

beforeEach(() => {
  mockDeniedFeedback.mockClear();
  mockUnlockFeedback.mockClear();
  useAppStore.setState({
    status: 'idle',
    plan: {
      focusMin: 20,
      breakMin: 10,
      loops: 2,
      prepEnabled: false,
      countDirection: 'down',
      companionId: 'basic',
    },
    wallet: { coins: 200 },
    companions: COMPANIONS,
    categories: [],
    elapsedMs: 0,
    coinsAwarded: 0,
    skipped: false,
    schedule: [],
  });
});

// Mounted while idle in every test below, then driven via store actions —
// not the other way around. useRunTicker's own mount effect calls tick()
// using the real wall clock, which would otherwise silently overwrite a
// position set with these fake T0-relative timestamps if the store were
// driven to 'running' before the component ever mounted.
function renderIdle() {
  render(<TimerScreen />);
}

describe('timer screen subheading', () => {
  it("shows the current segment's total length next to its phase name while running", () => {
    renderIdle();
    act(() => useAppStore.getState().startRun(T0));

    expect(screen.getByText('Focus Time · 20 min')).toBeTruthy();
  });

  it('updates to the break length once the run crosses into break', () => {
    renderIdle();
    act(() => useAppStore.getState().startRun(T0));
    act(() => useAppStore.getState().tick(T0 + 20 * MIN));

    expect(screen.getByText('Break Time · 10 min')).toBeTruthy();
  });

  it('shows the planned length while paused, not just while running', () => {
    renderIdle();
    act(() => useAppStore.getState().startRun(T0));
    act(() => useAppStore.getState().pause(T0 + 3 * MIN));

    expect(screen.getByText('Focus Time · 20 min')).toBeTruthy();
  });

  it('shows nothing before a session has started', () => {
    renderIdle();

    expect(screen.queryByText(/Focus Time/)).toBeNull();
  });

  it("shows the prep segment's length when prep is enabled", () => {
    renderIdle();
    act(() => {
      useAppStore.setState({ plan: { ...useAppStore.getState().plan, prepEnabled: true } });
      useAppStore.getState().startRun(T0);
    });

    expect(screen.getByText('Prep Time · 5 min')).toBeTruthy();
  });
});

describe('timer screen session summary', () => {
  it('names the tagged category and the total planned length', () => {
    act(() =>
      useAppStore.setState({
        categories: [{ id: 'cat_egg', name: 'egg', color: 'yellow' }],
        plan: { ...useAppStore.getState().plan, categoryId: 'cat_egg' },
      }),
    );
    renderIdle();

    // 20 focus + 10 break, twice.
    expect(screen.getByText('egg session · 1 hr')).toBeTruthy();
  });

  it('falls back to "focus" when no category is tagged', () => {
    renderIdle();

    expect(screen.getByText('focus session · 1 hr')).toBeTruthy();
  });

  it('keeps counting prep time toward the total', () => {
    act(() =>
      useAppStore.setState({ plan: { ...useAppStore.getState().plan, prepEnabled: true } }),
    );
    renderIdle();

    expect(screen.getByText('focus session · 1 hr 5 min')).toBeTruthy();
  });
});

describe('timer screen companion unlock feedback', () => {
  function browseToEgg() {
    renderIdle();
    act(() => fireEvent.press(screen.getByLabelText('Next buddy')));
  }

  it('plays denied feedback and skips the confirm alert when coins are short', () => {
    act(() => useAppStore.setState({ wallet: { coins: 100 } })); // egg costs 500
    browseToEgg();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    act(() => fireEvent.press(screen.getByLabelText('Unlock Egg Capy for 500 coins')));

    expect(mockDeniedFeedback).toHaveBeenCalledTimes(1);
    expect(mockUnlockFeedback).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Not enough coins', expect.any(String), expect.anything());
  });

  it('plays unlock feedback once the purchase actually succeeds, not on the opening tap', () => {
    act(() => useAppStore.setState({ wallet: { coins: 1000 } }));
    browseToEgg();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // Simulate tapping the "Unlock" button in the confirm dialog.
      const unlockButton = buttons?.find((b) => b.text === 'Unlock');
      unlockButton?.onPress?.();
    });

    act(() => fireEvent.press(screen.getByLabelText('Unlock Egg Capy for 500 coins')));

    expect(alertSpy).toHaveBeenCalledWith('Unlock buddy?', expect.any(String), expect.anything());
    expect(mockUnlockFeedback).toHaveBeenCalledTimes(1);
    expect(mockDeniedFeedback).not.toHaveBeenCalled();
    expect(useAppStore.getState().companions.find((c) => c.id === 'egg')?.unlocked).toBe(true);
  });
});

describe('timer screen coin award', () => {
  it('reflects the 10-coins-per-minute rate on the completion screen', () => {
    renderIdle();
    act(() => useAppStore.getState().startRun(T0));
    // Full schedule: 20 focus / 10 break, twice — 40 minutes of focus.
    act(() => useAppStore.getState().tick(T0 + 60 * MIN));

    // 40 focus minutes * 10 coins/min.
    expect(screen.getByText('+400')).toBeTruthy();
  });
});
