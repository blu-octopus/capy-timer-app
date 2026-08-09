import { useEffect, useRef } from 'react';

import { phaseFeedback, successFeedback } from '@/src/feedback';
import { useAppStore } from '@/src/store';

/**
 * Marks the moments the run passes through on its own — a phase handing over
 * to the next one, and the session finishing — with the same haptic-and-sound
 * feedback that presses get.
 *
 * These are the only two events the user doesn't trigger by touching
 * something, so without this they'd be the only transitions in the app that
 * happen in silence.
 *
 * Subscribes to [status, phase, loopIndex] for the same reason
 * useSessionNotifications does: those three change only on a real event,
 * while elapsedMs changes every 250ms.
 */
export function useRunFeedback() {
  const status = useAppStore((s) => s.status);
  const phase = useAppStore((s) => s.phase);
  const loopIndex = useAppStore((s) => s.loopIndex);

  // Undefined until the first run of the effect, so mounting mid-run (a cold
  // start that rehydrated a live session) doesn't fire as if a phase had just
  // turned over.
  const previous = useRef<{ status: string; phase: string; loopIndex: number } | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = { status, phase, loopIndex };
    if (!before) return;

    if (status === 'ended' && before.status !== 'ended') {
      successFeedback();
      return;
    }

    // A phase boundary only counts while the run is live; the same fields
    // also change when a run is reset, and that shouldn't chime.
    const crossedBoundary =
      status === 'running' &&
      before.status === 'running' &&
      (phase !== before.phase || loopIndex !== before.loopIndex);

    if (crossedBoundary) phaseFeedback();
  }, [status, phase, loopIndex]);
}
