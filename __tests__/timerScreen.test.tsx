/**
 * Screen-level checks for the running-state subheading and the coin math it
 * sits next to. The store-level coin math itself is covered by
 * timer.test.ts; this file is about what actually reaches the screen.
 */

import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import TimerScreen from '@/app/index';
import { useAppStore } from '@/src/store';
import type { Companion } from '@/src/store/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const COMPANIONS: Companion[] = [{ id: 'basic', name: 'Basic Capy', unlocked: true, priceCoins: 0 }];
const T0 = 1_800_000_000_000;
const MIN = 60 * 1000;

beforeEach(() => {
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
