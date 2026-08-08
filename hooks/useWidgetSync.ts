import { useEffect } from 'react';

import { pushWidgetSnapshot } from '@/src/widgets/bridge';
import { buildWidgetSnapshot } from '@/src/widgets/snapshot';
import { useAppStore } from '@/src/store';

/**
 * Mirrors run/plan state to the native widgets whenever it meaningfully
 * changes. Mounted once at the app root (see app/_layout.tsx) — the widgets
 * have no access to the live Zustand store at all, since they render in a
 * separate process (iOS) or a headless JS task (Android), not the app's own
 * React tree.
 *
 * Re-syncs on [status, phase, loopIndex] rather than every tick, matching
 * useSessionNotifications: those only change on a real event, whereas
 * elapsedMs changes every 250ms and would push a snapshot for no reason.
 */
export function useWidgetSync() {
  const status = useAppStore((s) => s.status);
  const phase = useAppStore((s) => s.phase);
  const loopIndex = useAppStore((s) => s.loopIndex);

  useEffect(() => {
    const snapshot = buildWidgetSnapshot(useAppStore.getState(), Date.now());
    void pushWidgetSnapshot(snapshot);
  }, [status, phase, loopIndex]);
}
