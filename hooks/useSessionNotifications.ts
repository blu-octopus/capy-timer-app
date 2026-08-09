import { useEffect, useRef } from 'react';

import {
  cancelRunNotifications,
  ensureNotificationPermission,
  scheduleRunNotifications,
} from '@/src/notifications';
import { useAppStore } from '@/src/store';

/**
 * Keeps one local notification pending for every phase boundary the run has
 * left — each focus→break and break→focus hand-off plus the final
 * completion.
 *
 * Re-syncs on [status, phase, loopIndex] rather than on every tick: those
 * three only change on a real event (start, pause/resume, natural phase
 * advance, or a skip), whereas elapsedMs changes every 250ms and would
 * otherwise cancel-and-reschedule during the entire run for nothing. Every
 * re-sync cancels everything pending and reschedules only the boundaries
 * still ahead, so a rehydrated mid-run session never gets duplicates.
 */
export function useSessionNotifications() {
  const status = useAppStore((s) => s.status);
  const phase = useAppStore((s) => s.phase);
  const loopIndex = useAppStore((s) => s.loopIndex);

  const pendingIds = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (pendingIds.current.length) {
        await cancelRunNotifications(pendingIds.current);
        pendingIds.current = [];
      }

      if (status !== 'running') return;

      const granted = await ensureNotificationPermission();
      if (!granted || cancelled) return;

      const state = useAppStore.getState();
      const scheduled = await scheduleRunNotifications(state.schedule, state.anchorTs);
      if (cancelled) {
        // Status/phase moved on again before the schedule calls returned.
        await cancelRunNotifications(scheduled);
      } else {
        pendingIds.current = scheduled;
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [status, phase, loopIndex]);

  useEffect(
    () => () => {
      void cancelRunNotifications(pendingIds.current);
    },
    [],
  );
}
