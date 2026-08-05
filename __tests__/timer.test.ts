/**
 * The timer resolves position from wall-clock elapsed time rather than
 * accumulating ticks, so these tests drive it by passing explicit `now`
 * values — the same path a backgrounded app takes when it wakes up.
 */

import { useAppStore } from '@/src/store';
import {
  buildSchedule,
  coinsForFocusMs,
  resolvePosition,
  totalPlanMinutes,
  PREP_MS,
  type SessionPlan,
} from '@/src/store/types';

const MIN = 60 * 1000;
const T0 = 1_800_000_000_000;

const plan = (overrides: Partial<SessionPlan> = {}): SessionPlan => ({
  focusMin: 20,
  breakMin: 10,
  loops: 2,
  prepEnabled: false,
  countDirection: 'down',
  companionId: 'basic',
  ...overrides,
});

function setup(planOverrides: Partial<SessionPlan> = {}) {
  useAppStore.setState({
    plan: plan(planOverrides),
    wallet: { coins: 200 },
    status: 'idle',
    elapsedMs: 0,
    coinsAwarded: 0,
    skipped: false,
    schedule: [],
  });
  return useAppStore.getState();
}

describe('buildSchedule', () => {
  it('alternates focus and break without a trailing break', () => {
    const schedule = buildSchedule(plan());
    expect(schedule.map((s) => s.phase)).toEqual(['focus', 'break', 'focus']);
  });

  it('puts prep first when enabled', () => {
    const schedule = buildSchedule(plan({ prepEnabled: true }));
    expect(schedule[0]).toMatchObject({ phase: 'prep', offsetMs: 0, durationMs: PREP_MS });
    expect(schedule[1]!.offsetMs).toBe(PREP_MS);
  });

  it('omits breaks entirely when break duration is zero', () => {
    const schedule = buildSchedule(plan({ breakMin: 0, loops: 3 }));
    expect(schedule.map((s) => s.phase)).toEqual(['focus', 'focus', 'focus']);
  });

  it('lays segments end to end with no gaps', () => {
    const schedule = buildSchedule(plan({ prepEnabled: true }));
    for (let i = 1; i < schedule.length; i++) {
      const prev = schedule[i - 1]!;
      expect(schedule[i]!.offsetMs).toBe(prev.offsetMs + prev.durationMs);
    }
  });
});

describe('totalPlanMinutes', () => {
  it('sums focus and break across loops', () => {
    // (20 + 10) + 20 — no trailing break.
    expect(totalPlanMinutes(plan())).toBe(50);
  });

  it('includes the fixed prep block', () => {
    expect(totalPlanMinutes(plan({ prepEnabled: true }))).toBe(55);
  });
});

describe('resolvePosition', () => {
  const schedule = buildSchedule(plan());

  it('reports the phase containing the elapsed time', () => {
    const at = resolvePosition(schedule, 25 * MIN);
    expect(at.segment!.phase).toBe('break');
    expect(at.msInPhase).toBe(5 * MIN);
  });

  it('accumulates completed focus across earlier phases', () => {
    // 20 focus + 10 break + 5 into the second focus.
    const at = resolvePosition(schedule, 35 * MIN);
    expect(at.focusMsCompleted).toBe(25 * MIN);
    expect(at.breakMsCompleted).toBe(10 * MIN);
  });

  it('flags completion past the end of the schedule', () => {
    const at = resolvePosition(schedule, 999 * MIN);
    expect(at.finished).toBe(true);
    expect(at.focusMsCompleted).toBe(40 * MIN);
  });
});

describe('coinsForFocusMs', () => {
  it('pays one coin per whole focus minute', () => {
    expect(coinsForFocusMs(25 * MIN)).toBe(25);
    expect(coinsForFocusMs(25.9 * MIN)).toBe(25);
    expect(coinsForFocusMs(30 * 1000)).toBe(0);
  });
});

describe('timer run', () => {
  it('starts in prep when enabled, focus otherwise', () => {
    setup().startRun(T0);
    expect(useAppStore.getState().phase).toBe('focus');

    setup({ prepEnabled: true }).startRun(T0);
    expect(useAppStore.getState().phase).toBe('prep');
  });

  it('advances phases as wall-clock time passes', () => {
    setup().startRun(T0);

    useAppStore.getState().tick(T0 + 5 * MIN);
    expect(useAppStore.getState().phase).toBe('focus');

    useAppStore.getState().tick(T0 + 25 * MIN);
    expect(useAppStore.getState().phase).toBe('break');
    expect(useAppStore.getState().loopIndex).toBe(0);

    useAppStore.getState().tick(T0 + 35 * MIN);
    expect(useAppStore.getState().phase).toBe('focus');
    expect(useAppStore.getState().loopIndex).toBe(1);
  });

  it('lands in the right phase after being backgrounded, without intermediate ticks', () => {
    setup().startRun(T0);

    // App suspended at minute 1, resumed at minute 35 — one tick, no catch-up loop.
    useAppStore.getState().tick(T0 + 35 * MIN);

    const state = useAppStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.loopIndex).toBe(1);
    expect(state.focusMsCompleted).toBe(25 * MIN);
  });

  it('does not count paused time toward progress', () => {
    setup().startRun(T0);

    useAppStore.getState().pause(T0 + 10 * MIN);
    expect(useAppStore.getState().elapsedMs).toBe(10 * MIN);

    // An hour passes while paused.
    useAppStore.getState().tick(T0 + 70 * MIN);
    expect(useAppStore.getState().elapsedMs).toBe(10 * MIN);

    useAppStore.getState().resume(T0 + 70 * MIN);
    useAppStore.getState().tick(T0 + 75 * MIN);
    expect(useAppStore.getState().elapsedMs).toBe(15 * MIN);
    expect(useAppStore.getState().phase).toBe('focus');
  });

  it('ends and awards coins when the schedule completes', () => {
    setup().startRun(T0);
    useAppStore.getState().tick(T0 + 60 * MIN);

    const state = useAppStore.getState();
    expect(state.status).toBe('ended');
    // 40 minutes of focus across both loops.
    expect(state.coinsAwarded).toBe(40);
    expect(state.wallet.coins).toBe(240);
  });

  it('skips to the next phase and keeps the clock consistent', () => {
    setup().startRun(T0);
    useAppStore.getState().tick(T0 + 5 * MIN);

    useAppStore.getState().skipPhase(T0 + 5 * MIN);
    const state = useAppStore.getState();
    expect(state.phase).toBe('break');
    expect(state.msInPhase).toBe(0);
    expect(state.skipped).toBe(true);
  });

  it('ends the run when skipping the final phase', () => {
    setup().startRun(T0);
    // Into the last focus phase.
    useAppStore.getState().tick(T0 + 35 * MIN);
    useAppStore.getState().skipPhase(T0 + 35 * MIN);

    expect(useAppStore.getState().status).toBe('ended');
  });

  it('pays only for focus time actually worked when ended early', () => {
    setup().startRun(T0);
    useAppStore.getState().endRun(T0 + 7 * MIN);

    const state = useAppStore.getState();
    expect(state.coinsAwarded).toBe(7);
    expect(state.wallet.coins).toBe(207);
  });

  it('does not award coins twice if endRun is called again', () => {
    setup().startRun(T0);
    useAppStore.getState().endRun(T0 + 10 * MIN);
    const afterFirst = useAppStore.getState().wallet.coins;

    useAppStore.getState().endRun(T0 + 20 * MIN);
    expect(useAppStore.getState().wallet.coins).toBe(afterFirst);
  });

  it('ignores ticks while idle', () => {
    setup();
    useAppStore.getState().tick(T0 + 99 * MIN);
    expect(useAppStore.getState().status).toBe('idle');
    expect(useAppStore.getState().elapsedMs).toBe(0);
  });
});

describe('companions', () => {
  beforeEach(() => {
    useAppStore.setState({
      wallet: { coins: 1200 },
      companions: [
        { id: 'basic', name: 'Basic Capy', unlocked: true, priceCoins: 0 },
        { id: 'egg', name: 'Egg Capy', unlocked: false, priceCoins: 1000 },
        { id: 'toilet', name: 'Toilet Capy', unlocked: false, priceCoins: 2500 },
      ],
    });
  });

  it('unlocks and deducts when the balance covers the price', () => {
    expect(useAppStore.getState().unlockCompanion('egg')).toBe(true);
    const state = useAppStore.getState();
    expect(state.wallet.coins).toBe(200);
    expect(state.companions.find((c) => c.id === 'egg')!.unlocked).toBe(true);
  });

  it('refuses when coins are short and leaves the balance alone', () => {
    expect(useAppStore.getState().unlockCompanion('toilet')).toBe(false);
    const state = useAppStore.getState();
    expect(state.wallet.coins).toBe(1200);
    expect(state.companions.find((c) => c.id === 'toilet')!.unlocked).toBe(false);
  });

  it('does not charge twice for an already unlocked companion', () => {
    expect(useAppStore.getState().unlockCompanion('basic')).toBe(false);
    expect(useAppStore.getState().wallet.coins).toBe(1200);
  });
});
