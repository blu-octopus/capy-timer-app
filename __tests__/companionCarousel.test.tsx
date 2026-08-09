/**
 * The carousel lives on the timer screen now, not in the setup sheet — you
 * pick a buddy where you can see them, and the sheet is only about time.
 *
 * Swipe selection isn't exercised here (jsdom/RNTL doesn't fire real momentum
 * scroll events), so this covers the arrow path plus the rule that actually
 * matters: browsing a locked buddy previews it without adopting it.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { CompanionCarousel } from '@/components/capy/CompanionCarousel';
import TimerScreen from '@/app/index';
import { useAppStore } from '@/src/store';
import type { Companion } from '@/src/store/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const COMPANIONS: Companion[] = [
  { id: 'basic', name: 'Basic Capy', unlocked: true, priceCoins: 0 },
  { id: 'egg', name: 'Egg Capy', unlocked: true, priceCoins: 1000 },
  { id: 'toilet', name: 'Toilet Capy', unlocked: false, priceCoins: 2500 },
];

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
    wallet: { coins: 5000 },
    companions: COMPANIONS,
    categories: [],
  });
});

describe('CompanionCarousel', () => {
  it('reports the next and previous index when the arrows are pressed', () => {
    const onIndexChange = jest.fn();
    render(
      <CompanionCarousel companions={COMPANIONS} index={1} onIndexChange={onIndexChange} />,
    );

    fireEvent.press(screen.getByLabelText('Next buddy'));
    expect(onIndexChange).toHaveBeenCalledWith(2);

    fireEvent.press(screen.getByLabelText('Previous buddy'));
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('disables the arrows at each end of the list', () => {
    const { rerender } = render(
      <CompanionCarousel companions={COMPANIONS} index={0} onIndexChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Previous buddy').props.accessibilityState.disabled).toBe(true);

    rerender(
      <CompanionCarousel companions={COMPANIONS} index={2} onIndexChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Next buddy').props.accessibilityState.disabled).toBe(true);
  });
});

describe('timer screen companion browsing', () => {
  it('adopts an unlocked buddy as you swipe to it', () => {
    render(<TimerScreen />);

    fireEvent.press(screen.getByLabelText('Next buddy'));

    expect(useAppStore.getState().plan.companionId).toBe('egg');
  });

  it('previews a locked buddy without adopting it', () => {
    render(<TimerScreen />);

    fireEvent.press(screen.getByLabelText('Next buddy'));
    fireEvent.press(screen.getByLabelText('Next buddy'));

    // Browsing moved to the locked one, but the plan kept the last unlocked.
    expect(useAppStore.getState().plan.companionId).toBe('egg');
    expect(screen.getByLabelText('Unlock Toilet Capy for 2500 coins')).toBeTruthy();
  });

  it('offers session setup, not a price, for a buddy you already own', () => {
    render(<TimerScreen />);

    expect(screen.getByText('Session Details')).toBeTruthy();
    expect(screen.queryByText('unlock for')).toBeNull();
  });

  it('hides the carousel once a run is under way', () => {
    render(<TimerScreen />);
    expect(screen.getByLabelText('Next buddy')).toBeTruthy();

    act(() => {
      useAppStore.setState({ status: 'running' });
    });

    expect(screen.queryByLabelText('Next buddy')).toBeNull();
  });
});
