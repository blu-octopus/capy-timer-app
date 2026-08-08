/**
 * The outlined button's hand-drawn border is generated from its measured
 * size, so it only appears once onLayout has reported a box. This guards
 * that wiring — a silently unmeasured button renders with no outline at all.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Button } from '@/components/ui/Button';

function layout(testId: string, width: number, height: number) {
  fireEvent(screen.getByTestId(testId), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Session Details" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Session Details')).toBeTruthy();
  });

  it('draws no outline for the filled variant', () => {
    render(<Button label="Start" onPress={() => {}} testID="btn" />);
    layout('btn-box', 120, 28);
    expect(screen.queryByTestId('wobble-border')).toBeNull();
  });

  it('draws the outline once the outlined variant has been measured', () => {
    render(<Button label="Details" variant="outlined" onPress={() => {}} testID="btn" />);

    // Before layout there is no measured box, so nothing to trace.
    expect(screen.queryByTestId('wobble-border')).toBeNull();

    layout('btn-box', 134, 28);
    expect(screen.getByTestId('wobble-border')).toBeTruthy();
  });

  it('does not fire onPress while disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Nope" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
