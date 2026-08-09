/**
 * Phase hand-offs and completion are the only transitions the user doesn't
 * cause by touching something, so they're the only ones that need the app to
 * volunteer feedback. The risk is firing when nothing really happened —
 * notably on a cold start that rehydrated a live run.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useRunFeedback } from '@/hooks/useRunFeedback';
import { phaseFeedback, successFeedback } from '@/src/feedback';
import { useAppStore, type AppState } from '@/src/store';

jest.mock('@/src/feedback', () => ({
  phaseFeedback: jest.fn(),
  successFeedback: jest.fn(),
}));

/** The hook subscribes to the store, so a write is a render — hence act(). */
function setRun(partial: Partial<AppState>) {
  act(() => {
    useAppStore.setState(partial);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setRun({ status: 'idle', phase: 'focus', loopIndex: 0 });
});

describe('useRunFeedback', () => {
  it('chimes when a phase hands over to the next', () => {
    setRun({ status: 'running', phase: 'focus', loopIndex: 0 });
    const { rerender } = renderHook(() => useRunFeedback());

    setRun({ phase: 'break' });
    rerender({});

    expect(phaseFeedback).toHaveBeenCalledTimes(1);
  });

  it('chimes when a new loop begins', () => {
    setRun({ status: 'running', phase: 'focus', loopIndex: 0 });
    const { rerender } = renderHook(() => useRunFeedback());

    setRun({ loopIndex: 1 });
    rerender({});

    expect(phaseFeedback).toHaveBeenCalledTimes(1);
  });

  it('plays the success sound once when the run ends', () => {
    setRun({ status: 'running', phase: 'focus', loopIndex: 0 });
    const { rerender } = renderHook(() => useRunFeedback());

    setRun({ status: 'ended' });
    rerender({});

    expect(successFeedback).toHaveBeenCalledTimes(1);
    expect(phaseFeedback).not.toHaveBeenCalled();
  });

  it('stays quiet on mount, so rehydrating a live run does not fire', () => {
    // A cold start restores a mid-run session; nothing just happened.
    setRun({ status: 'running', phase: 'break', loopIndex: 1 });
    renderHook(() => useRunFeedback());

    expect(phaseFeedback).not.toHaveBeenCalled();
    expect(successFeedback).not.toHaveBeenCalled();
  });

  it('stays quiet when a finished run is reset back to idle', () => {
    setRun({ status: 'ended', phase: 'break', loopIndex: 1 });
    const { rerender } = renderHook(() => useRunFeedback());

    setRun({ status: 'idle', phase: 'focus', loopIndex: 0 });
    rerender({});

    expect(phaseFeedback).not.toHaveBeenCalled();
  });

  it('stays quiet across pause and resume, which the user already felt', () => {
    setRun({ status: 'running', phase: 'focus', loopIndex: 0 });
    const { rerender } = renderHook(() => useRunFeedback());

    setRun({ status: 'paused' });
    rerender({});
    setRun({ status: 'running' });
    rerender({});

    expect(phaseFeedback).not.toHaveBeenCalled();
    expect(successFeedback).not.toHaveBeenCalled();
  });
});
