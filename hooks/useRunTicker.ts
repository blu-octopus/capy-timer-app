import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAppStore } from '@/src/store';

/** Polling cadence. Fast enough that the seconds digit never looks stale. */
const TICK_MS = 250;

/**
 * Drives the timer while the app is in the foreground and reconciles it on
 * resume. The interval only samples the clock — position comes from elapsed
 * wall time — so a missed or throttled tick can't drift the countdown, and
 * iOS suspending JS entirely just means one catch-up tick on wake.
 */
export function useRunTicker() {
  const status = useAppStore((s) => s.status);

  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => useAppStore.getState().tick();
    tick();

    const interval = setInterval(tick, TICK_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [status]);
}
