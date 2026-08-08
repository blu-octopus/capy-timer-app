/**
 * The avatar carousel swipes via a paged FlatList now, but the arrow
 * buttons remain as an accessible affordance and must still drive
 * selection (and adopt the selected companion) the same way they did
 * before the carousel became swipeable. Momentum-scroll (swipe) selection
 * isn't exercised here — jsdom/RNTL doesn't fire real scroll momentum
 * events — so this is a smoke test of the arrow path; swipe behavior is a
 * manual on-device check.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import SessionSetupScreen from '@/app/session-setup';
import { useAppStore } from '@/src/store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/src/db/categories', () => ({
  createCategory: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  useAppStore.setState({
    plan: {
      focusMin: 20,
      breakMin: 10,
      loops: 2,
      prepEnabled: false,
      countDirection: 'down',
      companionId: 'basic',
    },
    wallet: { coins: 5000 },
    companions: [
      { id: 'basic', name: 'Basic Capy', unlocked: true, priceCoins: 0 },
      { id: 'egg', name: 'Egg Capy', unlocked: true, priceCoins: 1000 },
      { id: 'toilet', name: 'Toilet Capy', unlocked: true, priceCoins: 2500 },
    ],
    categories: [],
  });
});

describe('session-setup avatar carousel', () => {
  it('advances to the next companion and adopts it when the arrow is pressed', () => {
    render(<SessionSetupScreen />);

    fireEvent.press(screen.getByLabelText('Next buddy'));

    expect(useAppStore.getState().plan.companionId).toBe('egg');
  });

  it('does not go past the first companion', () => {
    render(<SessionSetupScreen />);

    expect(screen.getByLabelText('Previous buddy').props.accessibilityState.disabled).toBe(true);
  });

  it('does not go past the last companion', () => {
    render(<SessionSetupScreen />);

    fireEvent.press(screen.getByLabelText('Next buddy'));
    fireEvent.press(screen.getByLabelText('Next buddy'));

    expect(useAppStore.getState().plan.companionId).toBe('toilet');
    expect(screen.getByLabelText('Next buddy').props.accessibilityState.disabled).toBe(true);
  });
});
