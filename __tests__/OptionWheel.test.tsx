/**
 * The wheel's motion lives in worklets that Reanimated's jest mock doesn't
 * run, so this covers the parts that survive into the tree: which option
 * reads as selected, and that simply rendering never reports a change (the
 * wheel writes straight into the session plan, so a spurious onChange would
 * silently rewrite someone's settings).
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { OptionWheel } from '@/components/ui/OptionWheel';

const MINUTES = [5, 10, 15, 20, 25, 30].map((value) => ({ value, label: String(value) }));

describe('OptionWheel', () => {
  it('renders every option so the neighbours are visible around the choice', () => {
    render(
      <OptionWheel options={MINUTES} value={20} onChange={jest.fn()} accessibilityLabel="Focus" />,
    );

    for (const option of MINUTES) {
      expect(screen.getByText(option.label)).toBeTruthy();
    }
  });

  it('exposes the selected option to assistive tech', () => {
    render(
      <OptionWheel options={MINUTES} value={20} onChange={jest.fn()} accessibilityLabel="Focus" />,
    );

    expect(screen.getByLabelText('Focus').props.accessibilityValue).toEqual({ text: '20' });
  });

  it('does not report a change just for rendering', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <OptionWheel options={MINUTES} value={20} onChange={onChange} accessibilityLabel="Focus" />,
    );

    rerender(
      <OptionWheel options={MINUTES} value={20} onChange={onChange} accessibilityLabel="Focus" />,
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the value when it changes from elsewhere', () => {
    const { rerender } = render(
      <OptionWheel options={MINUTES} value={20} onChange={jest.fn()} accessibilityLabel="Focus" />,
    );

    rerender(
      <OptionWheel options={MINUTES} value={30} onChange={jest.fn()} accessibilityLabel="Focus" />,
    );

    expect(screen.getByLabelText('Focus').props.accessibilityValue).toEqual({ text: '30' });
  });

  it('survives a value that is not in the list', () => {
    // Persisted plans predate option-list changes; falling back beats crashing.
    expect(() =>
      render(<OptionWheel options={MINUTES} value={999} onChange={jest.fn()} />),
    ).not.toThrow();
  });
});
