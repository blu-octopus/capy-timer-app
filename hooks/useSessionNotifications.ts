import { useEffect, useRef } from 'react';

import {
  cancelSessionNotification,
  ensureNotificationPermission,
  scheduleSessionNotification,
} from '@/src/notifications';
import { useAppStore } from '@/src/store';

/**
 * Keeps one local notification scheduled for whenever the run's *total*
 * remaining time elapses — not each phase — since navigation to the
 * completion screen only happens once, at the very end.
 *
 * Re-syncs on [status, phase, loopIndex] rather than on every tick: those
 * three only change on a real event (start, pause/resume, natural phase
 * advance, or a skip), whereas elapsedMs changes every 250ms and would
 * otherwise cancel-and-reschedule during the entire run for nothing.
 */
export function useSessionNotifications() {
  const status = useAppStore((s) => s.status);
  const phase = useAppStore((s) => s.phase);
  const loopIndex = useAppStore((s) => s.loopIndex);

  const notificationId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (notificationId.current) {
        await cancelSessionNotification(notificationId.current);
        notificationId.current = null;
      }

      if (status !== 'running') return;

      const granted = await ensureNotificationPermission();
      if (!granted || cancelled) return;

      const state = useAppStore.getState();
      const last = state.schedule[state.schedule.length - 1];
      if (!last) return;

      const totalMs = last.offsetMs + last.durationMs;
      const remainingMs = totalMs - state.elapsedMs;
      if (remainingMs <= 0) return;

      const id = await scheduleSessionNotification(remainingMs);
      if (cancelled) {
        // Status/phase moved on again before the schedule call returned.
        await cancelSessionNotification(id);
      } else {
        notificationId.current = id;
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [status, phase, loopIndex]);

  useEffect(
    () => () => {
      void cancelSessionNotification(notificationId.current);
    },
    [],
  );
}
