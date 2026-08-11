/**
 * The timer resolves position from wall-clock elapsed time rather than
 * accumulating ticks, so these tests drive it by passing explicit `now`
 * values — the same path a backgrounded app takes when it wakes up.
 */

import { recordSession } from '@/src/db/sessions';
import { useAppStore } from '@/src/store';
import {
  applyDailyCap,
  buildSchedule,
  coinsForFocusMs,
  DAILY_PAID_FOCUS_MS,
  resolvePosition,
  startOfLocalDay,
  totalPlanMinutes,
  PREP_MS,
  type SessionPlan,
} from '@/src/store/types';

jest.mock('@/src/db/sessions', () => ({
  recordSession: jest.fn().mockResolvedValue(undefined),
  newSessionId: jest.fn(() => `ses_${Math.random().toString(36).slice(2, 10)}`),
}));

const recordSessionMock = recordSession as jest.Mock;

beforeEach(() => {
  recordSessionMock.mockClear();
});

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
    coinsCapped: false,
    skipped: false,
    schedule: [],
    paidFocusMsToday: 0,
    paidFocusDay: 0,
    fulfilledPurchaseIds: [],
  });
  return useAppStore.getState();
}

describe('buildSchedule', () => {
  it('gives every loop a full focus and break cycle', () => {
    const schedule = buildSchedule(plan());
    expect(schedule.map((s) => s.phase)).toEqual(['focus', 'break', 'focus', 'break']);
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
    // (20 + 10) * 2 — the design totals this plan as a flat hour.
    expect(totalPlanMinutes(plan())).toBe(60);
  });

  it('includes the fixed prep block', () => {
    expect(totalPlanMinutes(plan({ prepEnabled: true }))).toBe(65);
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
  it('pays 10 coins per whole focus minute', () => {
    expect(coinsForFocusMs(25 * MIN)).toBe(250);
    expect(coinsForFocusMs(25.9 * MIN)).toBe(250);
    expect(coinsForFocusMs(30 * 1000)).toBe(0);
  });
});

describe('applyDailyCap', () => {
  it('pays the full run when under the daily allowance', () => {
    const result = applyDailyCap(40 * MIN, { paidFocusMsToday: 0, paidFocusDay: 0 }, T0);
    expect(result.coins).toBe(400);
    expect(result.capped).toBe(false);
    expect(result.nextDaily.paidFocusMsToday).toBe(40 * MIN);
  });

  it('withholds coins once 3 hours of focus have already paid', () => {
    const today = startOfLocalDay(T0);
    const result = applyDailyCap(20 * MIN, {
      paidFocusMsToday: DAILY_PAID_FOCUS_MS,
      paidFocusDay: today,
    }, T0);
    expect(result.coins).toBe(0);
    expect(result.capped).toBe(true);
  });

  it('rolls the allowance over at local midnight', () => {
    const yesterday = startOfLocalDay(T0) - 24 * 60 * MIN;
    const result = applyDailyCap(20 * MIN, {
      paidFocusMsToday: DAILY_PAID_FOCUS_MS,
      paidFocusDay: yesterday,
    }, T0);
    expect(result.coins).toBe(200);
    expect(result.capped).toBe(false);
  });
});

describe('timer run', () => {
  it('does not restart a live run', () => {
    setup().startRun(T0);
    const runId = useAppStore.getState().runId;
    useAppStore.getState().startRun(T0 + MIN);
    expect(useAppStore.getState().runId).toBe(runId);
    expect(useAppStore.getState().startedAt).toBe(T0);
  });

  it('stops paying after 3 hours of focus in a local day', () => {
    setup({ focusMin: 120, breakMin: 0, loops: 2 }).startRun(T0);
    useAppStore.getState().tick(T0 + 240 * MIN);

    const state = useAppStore.getState();
    expect(state.status).toBe('ended');
    expect(state.coinsAwarded).toBe(1800);
    expect(state.coinsCapped).toBe(true);
    expect(state.wallet.coins).toBe(2000);
  });

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
    expect(state.coinsAwarded).toBe(400);
    expect(state.wallet.coins).toBe(600);
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

  it('does not pay for focus time jumped over by a skip', () => {
    setup().startRun(T0);
    useAppStore.getState().tick(T0 + 5 * MIN);

    // Skip out of the first focus with 15 of its 20 minutes unworked.
    useAppStore.getState().skipPhase(T0 + 5 * MIN);
    expect(useAppStore.getState().skippedFocusMs).toBe(15 * MIN);

    // Remaining schedule (10 break + 20 focus + 10 break) runs to the end.
    useAppStore.getState().tick(T0 + 45 * MIN);
    const state = useAppStore.getState();
    expect(state.status).toBe('ended');
    expect(state.coinsAwarded).toBe(250);
    expect(state.wallet.coins).toBe(450);
  });

  it('skipping a break changes no coin math', () => {
    setup().startRun(T0);
    useAppStore.getState().tick(T0 + 25 * MIN);
    expect(useAppStore.getState().phase).toBe('break');

    useAppStore.getState().skipPhase(T0 + 25 * MIN);
    expect(useAppStore.getState().skippedFocusMs).toBe(0);
    expect(useAppStore.getState().skippedBreakMs).toBe(5 * MIN);

    useAppStore.getState().tick(T0 + 55 * MIN);
    const state = useAppStore.getState();
    expect(state.status).toBe('ended');
    expect(state.coinsAwarded).toBe(400);
  });

  it('measures the skip from the wall clock, not the last tick', () => {
    setup().startRun(T0);

    // No tick since start: elapsedMs is stale at 0, but 7 minutes passed.
    useAppStore.getState().skipPhase(T0 + 7 * MIN);
    expect(useAppStore.getState().phase).toBe('break');
    expect(useAppStore.getState().skippedFocusMs).toBe(13 * MIN);
  });

  it('pays only worked focus when skipping the final phase ends the run', () => {
    setup({ breakMin: 0 }).startRun(T0);
    useAppStore.getState().tick(T0 + 25 * MIN);
    expect(useAppStore.getState().loopIndex).toBe(1);

    useAppStore.getState().skipPhase(T0 + 25 * MIN);
    const state = useAppStore.getState();
    expect(state.status).toBe('ended');
    expect(state.skipped).toBe(true);
    expect(state.coinsAwarded).toBe(250);
  });

  it('ends the run when skipping the final phase', () => {
    setup().startRun(T0);
    // Into the final break, the last phase of the plan.
    useAppStore.getState().tick(T0 + 52 * MIN);
    expect(useAppStore.getState().phase).toBe('break');

    useAppStore.getState().skipPhase(T0 + 52 * MIN);
    expect(useAppStore.getState().status).toBe('ended');
  });

  it('pays only for focus time actually worked when ended early', () => {
    setup().startRun(T0);
    useAppStore.getState().endRun(T0 + 7 * MIN);

    const state = useAppStore.getState();
    expect(state.coinsAwarded).toBe(70);
    expect(state.wallet.coins).toBe(270);
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

describe('run persistence and recovery', () => {
  it('records the session once, keyed by the run id, with worked durations', () => {
    setup().startRun(T0);
    useAppStore.getState().tick(T0 + 60 * MIN);

    expect(recordSessionMock).toHaveBeenCalledTimes(1);
    const row = recordSessionMock.mock.calls[0]![0];
    expect(row.id).toBe(useAppStore.getState().runId);
    expect(row).toMatchObject({
      startedAt: T0,
      finishedAt: T0 + 60 * MIN,
      focusMs: 40 * MIN,
      breakMs: 20 * MIN,
      coinsEarned: 400,
      skipped: 0,
    });
  });

  it('backdates finishedAt to the scheduled end when completion is noticed late', () => {
    setup().startRun(T0);
    // First tick half an hour after the run actually finished.
    useAppStore.getState().tick(T0 + 90 * MIN);

    expect(recordSessionMock.mock.calls[0]![0].finishedAt).toBe(T0 + 60 * MIN);
  });

  it('excludes skipped stretches from the recorded durations', () => {
    setup().startRun(T0);
    useAppStore.getState().skipPhase(T0 + 5 * MIN);
    useAppStore.getState().tick(T0 + 45 * MIN);

    expect(recordSessionMock.mock.calls[0]![0]).toMatchObject({
      focusMs: 25 * MIN,
      coinsEarned: 250,
      skipped: 1,
    });
  });

  it('settles a run that finished while the app was dead', () => {
    setup().startRun(T0);

    // Cold start: persisted 'running' state rehydrates, then reconciles.
    useAppStore.getState().reconcileAfterRestart(T0 + 90 * MIN);

    const state = useAppStore.getState();
    expect(state.status).toBe('ended');
    expect(state.coinsAwarded).toBe(400);
    expect(state.wallet.coins).toBe(600);
    expect(recordSessionMock).toHaveBeenCalledTimes(1);
  });

  it('leaves a still-live run untouched on restart', () => {
    setup().startRun(T0);
    useAppStore.getState().reconcileAfterRestart(T0 + 10 * MIN);

    expect(useAppStore.getState().status).toBe('running');
    expect(recordSessionMock).not.toHaveBeenCalled();
  });

  it('keeps a paused run frozen across restarts', () => {
    setup().startRun(T0);
    useAppStore.getState().pause(T0 + 10 * MIN);

    useAppStore.getState().reconcileAfterRestart(T0 + 300 * MIN);

    const state = useAppStore.getState();
    expect(state.status).toBe('paused');
    expect(state.elapsedMs).toBe(10 * MIN);
    expect(recordSessionMock).not.toHaveBeenCalled();
  });

  it('replays the history write for an ended run without re-awarding coins', () => {
    setup().startRun(T0);
    useAppStore.getState().tick(T0 + 60 * MIN);
    const firstRow = recordSessionMock.mock.calls[0]![0];
    recordSessionMock.mockClear();

    useAppStore.getState().reconcileAfterRestart(T0 + 61 * MIN);

    expect(useAppStore.getState().wallet.coins).toBe(600);
    expect(recordSessionMock).toHaveBeenCalledTimes(1);
    expect(recordSessionMock.mock.calls[0]![0].id).toBe(firstRow.id);
  });

  it('abandonRun records a skipped run, pays worked focus, and goes idle', () => {
    setup().startRun(T0);
    useAppStore.getState().pause(T0 + 7 * MIN);
    useAppStore.getState().abandonRun(T0 + 9 * MIN);

    const state = useAppStore.getState();
    expect(state.status).toBe('idle');
    expect(state.wallet.coins).toBe(270);
    expect(recordSessionMock).toHaveBeenCalledTimes(1);
    expect(recordSessionMock.mock.calls[0]![0]).toMatchObject({
      focusMs: 7 * MIN,
      coinsEarned: 70,
      skipped: 1,
      finishedAt: T0 + 9 * MIN,
    });
  });
});

describe('fulfillPurchase', () => {
  it('credits once per transaction id', () => {
    setup();
    expect(useAppStore.getState().fulfillPurchase('txn_1', 1000)).toBe(true);
    expect(useAppStore.getState().wallet.coins).toBe(1200);
    expect(useAppStore.getState().fulfillPurchase('txn_1', 1000)).toBe(false);
    expect(useAppStore.getState().wallet.coins).toBe(1200);
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
