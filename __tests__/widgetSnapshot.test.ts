/**
 * Widgets never run app JS — they read whatever was last pushed into native
 * storage, so this snapshot is the entire contract between the running
 * timer and what a widget can show. Getting phaseEndAt right matters most:
 * it's the one field a widget uses to compute its own remaining time
 * independent of the app (see src/widgets/android/render.tsx and the iOS
 * Text(timerInterval:) usage).
 */

import { useAppStore } from '@/src/store';
import type { SessionPlan } from '@/src/store/types';
import { buildWidgetSnapshot } from '@/src/widgets/snapshot';

const MIN = 60 * 1000;
const T0 = 1_800_000_000_000;

const plan: SessionPlan = {
  focusMin: 20,
  breakMin: 10,
  loops: 2,
  prepEnabled: false,
  countDirection: 'down',
  companionId: 'basic',
};

function setup() {
  useAppStore.setState({
    plan,
    status: 'idle',
    elapsedMs: 0,
    schedule: [],
    coinsAwarded: 0,
    coinsCapped: false,
    skipped: false,
    paidFocusMsToday: 0,
    paidFocusDay: 0,
  });
}

beforeEach(setup);

describe('buildWidgetSnapshot', () => {
  it('reports idle with no phase or end time', () => {
    const snapshot = buildWidgetSnapshot(useAppStore.getState(), T0);
    expect(snapshot).toMatchObject({
      status: 'idle',
      phase: null,
      phaseLabel: 'Ready to focus',
      phaseEndAt: null,
    });
  });

  it('computes the absolute wall-clock end of the current phase while running', () => {
    useAppStore.getState().startRun(T0);
    useAppStore.getState().tick(T0 + 5 * MIN);

    const snapshot = buildWidgetSnapshot(useAppStore.getState(), T0 + 5 * MIN);
    expect(snapshot.status).toBe('running');
    expect(snapshot.phase).toBe('focus');
    // Focus phase runs 0-20min from run start, so it ends at T0+20min.
    expect(snapshot.phaseEndAt).toBe(T0 + 20 * MIN);
  });

  it('recomputes phaseEndAt from the new anchor after a pause/resume', () => {
    useAppStore.getState().startRun(T0);
    useAppStore.getState().pause(T0 + 5 * MIN);
    // An hour passes while paused — must not leak into the end time.
    useAppStore.getState().resume(T0 + 65 * MIN);

    const snapshot = buildWidgetSnapshot(useAppStore.getState(), T0 + 65 * MIN);
    // 5 min already elapsed pre-pause, so 15 min remain from the resume point.
    expect(snapshot.phaseEndAt).toBe(T0 + 65 * MIN + 15 * MIN);
  });

  it('reports null phaseEndAt while paused, even though a phase is active', () => {
    useAppStore.getState().startRun(T0);
    useAppStore.getState().pause(T0 + 5 * MIN);

    const snapshot = buildWidgetSnapshot(useAppStore.getState(), T0 + 5 * MIN);
    expect(snapshot.status).toBe('paused');
    expect(snapshot.phase).toBe('focus');
    expect(snapshot.phaseEndAt).toBeNull();
  });

  it('carries the total loop count and companion for display', () => {
    useAppStore.getState().startRun(T0);
    const snapshot = buildWidgetSnapshot(useAppStore.getState(), T0);
    expect(snapshot.totalLoops).toBe(2);
    expect(snapshot.companionId).toBe('basic');
  });

  it('reports ended with no end time once the run completes', () => {
    useAppStore.getState().startRun(T0);
    useAppStore.getState().endRun(T0 + 65 * MIN);

    const snapshot = buildWidgetSnapshot(useAppStore.getState(), T0 + 65 * MIN);
    expect(snapshot.status).toBe('ended');
    expect(snapshot.phaseEndAt).toBeNull();
    expect(snapshot.phaseLabel).toBe('Session complete');
  });
});
