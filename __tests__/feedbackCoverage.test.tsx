/**
 * "Haptic feedback on every single interaction" is a promise that decays
 * silently: a new control gets added, nobody wires it, and nothing fails.
 *
 * These render the shared controls that don't route through Button or
 * IconButton and assert each one speaks up when pressed, so an unwired
 * addition shows as a red test rather than as a dead spot on a phone.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Checkbox } from '@/components/ui/Checkbox';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Toggle } from '@/components/ui/Toggle';
import { CoinWallet } from '@/components/capy/CoinWallet';
import { InAppPurchaseCard } from '@/components/ui/InAppPurchaseCard';
import { playFeedback } from '@/src/feedback';

jest.mock('@/src/feedback', () => {
  const playFeedback = jest.fn();
  return {
    playFeedback,
    tapFeedback: () => playFeedback('tap'),
    selectionFeedback: () => playFeedback('selection'),
    phaseFeedback: () => playFeedback('phase'),
    successFeedback: () => playFeedback('success'),
  };
});

const mockPlay = playFeedback as jest.MockedFunction<typeof playFeedback>;

beforeEach(() => jest.clearAllMocks());

describe('every shared control gives feedback when pressed', () => {
  it('Toggle', () => {
    render(<Toggle value={false} onValueChange={jest.fn()} accessibilityLabel="Prep" />);
    fireEvent.press(screen.getByLabelText('Prep'));
    expect(mockPlay).toHaveBeenCalledWith('selection');
  });

  it('SegmentedTabs', () => {
    render(
      <SegmentedTabs
        options={[
          { value: 'up', label: 'Up' },
          { value: 'down', label: 'Down' },
        ]}
        value="up"
        onChange={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Down'));
    expect(mockPlay).toHaveBeenCalledWith('selection');
  });

  it('Checkbox', () => {
    render(<Checkbox checked={false} onChange={jest.fn()} accessibilityLabel="Done" />);
    fireEvent.press(screen.getByLabelText('Done'));
    expect(mockPlay).toHaveBeenCalledWith('selection');
  });

  it('ColorPicker', () => {
    render(<ColorPicker value="green" onChange={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('red'));
    expect(mockPlay).toHaveBeenCalledWith('selection');
  });

  it('CoinWallet', () => {
    render(<CoinWallet amount={200} onPress={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('200 coins. Buy more.'));
    expect(mockPlay).toHaveBeenCalledWith('tap');
  });

  it('InAppPurchaseCard', () => {
    render(<InAppPurchaseCard coins={1000} priceString="$0.99" onPress={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('1,000 coins for $0.99'));
    expect(mockPlay).toHaveBeenCalledWith('tap');
  });

  it("still calls the control's own handler, not just the feedback", () => {
    const onValueChange = jest.fn();
    render(<Toggle value={false} onValueChange={onValueChange} accessibilityLabel="Prep" />);

    fireEvent.press(screen.getByLabelText('Prep'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
