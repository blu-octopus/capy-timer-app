/**
 * The wheel's motion lives in worklets that Reanimated's jest mock doesn't
 * run, so this covers the parts that survive into the tree: which option
 * reads as selected, and that simply rendering never reports a change (the
 * wheel writes straight into the session plan, so a spurious onChange would
 * silently rewrite someone's settings).
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { OptionWheel, resolveFlickTarget } from '@/components/ui/OptionWheel';

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

describe('resolveFlickTarget', () => {
  const ROW_HEIGHT = 37; // fontSize 22 * spacing 1.7, the wheel's own default
  const COUNT = 6; // matches MINUTES above

  /**
   * This is the reachable-through-the-UI bug: releasing a wheel mid-flight
   * with real momentum used to report every index the settle animation swept
   * through on its way to the final one, not just the final one — so a fast
   * flick from "20" to "5" would briefly write "15", then "10", then "5" into
   * the session plan instead of landing on "5" directly. Reanimated's Jest
   * mock no-ops useAnimatedReaction and resolves withTiming synchronously,
   * so that sweep is invisible to any test that renders the wheel — this is
   * exactly why the release math is pulled out as its own pure function.
   */
  it('reports the release once a flick carries past where the drag left off', () => {
    // At rest on index 2, flicking upward hard enough to jump to index 5.
    const velocityForIndex = (indexAway: number) => -(indexAway * ROW_HEIGHT * 6);
    const { target, shouldCommit } = resolveFlickTarget(2, velocityForIndex(3), ROW_HEIGHT, COUNT);

    expect(target).toBe(5);
    expect(shouldCommit).toBe(true);
  });

  it('does not ask for a second report when releasing without momentum', () => {
    // The overwhelmingly common case: the live drag already reported index 3
    // as the finger passed it, and the release has no velocity to carry it
    // further. A `true` here would double the haptic and re-write the plan
    // with a value it's already set to.
    const { target, shouldCommit } = resolveFlickTarget(3, 0, ROW_HEIGHT, COUNT);

    expect(target).toBe(3);
    expect(shouldCommit).toBe(false);
  });

  it('does not ask for a second report when a small nudge stays within the same index', () => {
    // Sitting right on 2 (already reported by the live drag) with a nudge
    // too small to carry it into 3.
    const { target, shouldCommit } = resolveFlickTarget(2.0, -20, ROW_HEIGHT, COUNT);

    expect(target).toBe(2);
    expect(shouldCommit).toBe(false);
  });

  it('clamps the target to the first option', () => {
    // Positive velocityY drives the position down toward index 0, same sign
    // convention as onUpdate's `panStart.value - translationY / rowHeight`.
    const massiveVelocityTowardZero = 100_000;
    const { target } = resolveFlickTarget(1, massiveVelocityTowardZero, ROW_HEIGHT, COUNT);

    expect(target).toBe(0);
  });

  it('clamps the target to the last option', () => {
    const massiveVelocityTowardEnd = -100_000;
    const { target } = resolveFlickTarget(COUNT - 2, massiveVelocityTowardEnd, ROW_HEIGHT, COUNT);

    expect(target).toBe(COUNT - 1);
  });

  it('reports when a big flick lands exactly on a clamped boundary', () => {
    // The boundary is a legitimate new index, not just an artifact of
    // clamping, so it still deserves its one report.
    const { target, shouldCommit } = resolveFlickTarget(2, 100_000, ROW_HEIGHT, COUNT);

    expect(target).toBe(0);
    expect(shouldCommit).toBe(true);
  });
});
