import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { newSessionId, recordSession } from '../db/sessions';
import type { NewSession } from '../db/schema';
import { lookupPremium } from '../purchases/entitlements';
import {
  applyDailyCap,
  buildSchedule,
  resolvePosition,
  type CategoryItem,
  type Companion,
  type DailyEarnState,
  type PhaseSegment,
  type RunPhase,
  type RunStatus,
  type SessionPlan,
} from './types';

export const DEFAULT_COMPANIONS: Companion[] = [
  { id: 'basic', name: 'Basic Capy', unlocked: true, priceCoins: 0 },
  { id: 'egg', name: 'Egg Capy', unlocked: false, priceCoins: 1000 },
  { id: 'fighting', name: 'Fighting! Capy', unlocked: false, priceCoins: 1500 },
  { id: 'toilet', name: 'Toilet Capy', unlocked: false, priceCoins: 2500 },
];

const DEFAULT_PLAN: SessionPlan = {
  focusMin: 20,
  breakMin: 10,
  loops: 2,
  prepEnabled: false,
  countDirection: 'down',
  categoryId: undefined,
  companionId: 'basic',
};

interface RunState {
  /** History-row id for this run, minted at start so recording is idempotent. */
  runId: string | null;
  status: RunStatus;
  phase: RunPhase;
  loopIndex: number;
  msInPhase: number;
  /** Elapsed run time excluding paused stretches. */
  elapsedMs: number;
  focusMsCompleted: number;
  breakMsCompleted: number;
  /** Wall-clock anchor: run start shifted forward by total paused time. */
  anchorTs: number;
  startedAt: number;
  /** Wall-clock time the run ended; 0 until then. */
  finishedAt: number;
  schedule: PhaseSegment[];
  skipped: boolean;
  /** Unworked focus/break time jumped over by skips; earns nothing. */
  skippedFocusMs: number;
  skippedBreakMs: number;
  coinsAwarded: number;
  /** True when the daily cap withheld coins this run, so the UI can say so. */
  coinsCapped: boolean;
}

const IDLE_RUN: RunState = {
  runId: null,
  status: 'idle',
  phase: 'focus',
  loopIndex: 0,
  msInPhase: 0,
  elapsedMs: 0,
  focusMsCompleted: 0,
  breakMsCompleted: 0,
  anchorTs: 0,
  startedAt: 0,
  finishedAt: 0,
  schedule: [],
  skipped: false,
  skippedFocusMs: 0,
  skippedBreakMs: 0,
  coinsAwarded: 0,
  coinsCapped: false,
};

export interface AppState extends RunState {
  plan: SessionPlan;
  wallet: { coins: number };
  companions: Companion[];
  categories: CategoryItem[];
  /**
   * Whether the premium entitlement is active. Persisted so a cold launch
   * with no network doesn't silently downgrade a paying customer to the free
   * tier; `syncPremium` corrects it once RevenueCat can be reached.
   */
  isPremium: boolean;
  /** Focus ms already paid out during `paidFocusDay`. */
  paidFocusMsToday: number;
  /** Local midnight of the day `paidFocusMsToday` refers to. */
  paidFocusDay: number;
  /** StoreKit/Play transaction ids that have already credited the wallet. */
  fulfilledPurchaseIds: string[];

  updatePlan: (updates: Partial<SessionPlan>) => void;
  setCategories: (categories: CategoryItem[]) => void;
  setPremium: (isPremium: boolean) => void;
  /** Re-reads the entitlement from RevenueCat. Never throws. Does not clobber a persisted true on lookup failure. */
  syncPremium: () => Promise<void>;

  startRun: (now?: number) => void;
  pause: (now?: number) => void;
  resume: (now?: number) => void;
  /** Jump to the next phase, or end the run if this was the last. */
  skipPhase: (now?: number) => void;
  endRun: (now?: number) => void;
  /** Finalize an in-progress run without celebration: record it, pay worked focus, go idle. */
  abandonRun: (now?: number) => void;
  reset: () => void;
  /** Reconciles state against the wall clock; safe to call at any cadence. */
  tick: (now?: number) => void;
  /** Settles a rehydrated run against the clock after a cold start. */
  reconcileAfterRestart: (now?: number) => void;

  addCoins: (amount: number) => void;
  /**
   * Credits `coins` once per `transactionId`. Returns false if this id
   * already paid out (crash/retry / listener replay).
   */
  fulfillPurchase: (transactionId: string, coins: number) => boolean;
  unlockCompanion: (id: string) => boolean;
  renameCompanion: (id: string, name: string) => void;
}

/** Milliseconds of run progress at time `now`, given the anchor. */
function elapsedAt(state: RunState, now: number): number {
  return Math.max(0, now - state.anchorTs);
}

/**
 * The history row for an ended run, derived entirely from persisted state so
 * it can be (re)built after a cold start. Durations are time actually
 * worked — skipped-over stretches are excluded.
 */
function sessionRecordFrom(state: AppState): NewSession {
  return {
    id: state.runId ?? newSessionId(),
    startedAt: state.startedAt,
    finishedAt: state.finishedAt || null,
    plannedMs: state.schedule.reduce((sum, s) => sum + s.durationMs, 0),
    focusMs: Math.max(0, state.focusMsCompleted - state.skippedFocusMs),
    breakMs: Math.max(0, state.breakMsCompleted - state.skippedBreakMs),
    loops: state.plan.loops,
    categoryId: state.plan.categoryId ?? null,
    companionId: state.plan.companionId,
    coinsEarned: state.coinsAwarded,
    skipped: state.skipped ? 1 : 0,
  };
}

function applyPosition(state: RunState, elapsedMs: number): Partial<RunState> {
  const position = resolvePosition(state.schedule, elapsedMs);

  return {
    elapsedMs,
    phase: position.segment?.phase ?? state.phase,
    loopIndex: position.segment?.loopIndex ?? state.loopIndex,
    msInPhase: position.msInPhase,
    focusMsCompleted: position.focusMsCompleted,
    breakMsCompleted: position.breakMsCompleted,
    status: position.finished ? ('ended' as RunStatus) : state.status,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...IDLE_RUN,
      plan: DEFAULT_PLAN,
      wallet: { coins: 200 },
      companions: DEFAULT_COMPANIONS,
      categories: [],
      isPremium: false,
      paidFocusMsToday: 0,
      paidFocusDay: 0,
      fulfilledPurchaseIds: [],

      updatePlan: (updates) => set((s) => ({ plan: { ...s.plan, ...updates } })),
      setCategories: (categories) => set({ categories }),
      setPremium: (isPremium) => set({ isPremium }),

      syncPremium: async () => {
        const lookup = await lookupPremium();
        if (lookup.kind === 'unknown') return;
        set({ isPremium: lookup.kind === 'active' });
      },

      startRun: (now = Date.now()) => {
        const state = get();
        if (state.status === 'running' || state.status === 'paused') return;

        const schedule = buildSchedule(state.plan);
        set({
          ...IDLE_RUN,
          runId: newSessionId(),
          schedule,
          status: 'running',
          phase: schedule[0]?.phase ?? 'focus',
          anchorTs: now,
          startedAt: now,
        });
      },

      pause: (now = Date.now()) => {
        const state = get();
        if (state.status !== 'running') return;
        const elapsedMs = elapsedAt(state, now);
        if (resolvePosition(state.schedule, elapsedMs).finished) {
          get().endRun(now);
          return;
        }
        // Freeze progress; resume re-anchors so paused time never counts.
        set({ ...applyPosition(state, elapsedMs), status: 'paused' });
      },

      resume: (now = Date.now()) => {
        const state = get();
        if (state.status !== 'paused') return;
        set({ status: 'running', anchorTs: now - state.elapsedMs });
      },

      skipPhase: (now = Date.now()) => {
        const state = get();
        if (state.status !== 'running' && state.status !== 'paused') return;

        const elapsedMs = state.status === 'paused' ? state.elapsedMs : elapsedAt(state, now);
        const current = resolvePosition(state.schedule, elapsedMs).segment;
        if (!current) return;

        const nextOffset = current.offsetMs + current.durationMs;
        const scheduleMs = state.schedule.reduce((sum, seg) => sum + seg.durationMs, 0);
        const isLast = nextOffset >= scheduleMs;

        if (isLast) {
          // endRun resolves position from real elapsed time, which already
          // excludes the unworked tail of this phase — no accumulation needed.
          set({ skipped: true });
          get().endRun(now);
          return;
        }

        // Jumping the clock forward makes the schedule position count the
        // whole phase as done; track the unworked part so it earns nothing.
        const unworkedMs = Math.max(0, nextOffset - elapsedMs);
        set({
          ...applyPosition(state, nextOffset),
          anchorTs: now - nextOffset,
          skipped: true,
          skippedFocusMs: state.skippedFocusMs + (current.phase === 'focus' ? unworkedMs : 0),
          skippedBreakMs: state.skippedBreakMs + (current.phase === 'break' ? unworkedMs : 0),
          status: state.status,
        });
      },

      endRun: (now = Date.now()) => {
        const state = get();
        if (state.status === 'idle' || state.status === 'ended') return;

        const elapsedMs = state.status === 'paused' ? state.elapsedMs : elapsedAt(state, now);
        const position = resolvePosition(state.schedule, elapsedMs);
        // Ending early still pays for focus minutes already worked, but
        // never for focus time that was skipped over. The daily cap is time,
        // not coins — Club 2x (later) must not feed back into paidMs.
        const daily: DailyEarnState = {
          paidFocusMsToday: state.paidFocusMsToday,
          paidFocusDay: state.paidFocusDay,
        };
        const earning = applyDailyCap(
          Math.max(0, position.focusMsCompleted - state.skippedFocusMs),
          daily,
          now,
        );

        // A run that completed in the background ended at its scheduled end,
        // not when the app woke up. A paused run ends when abandoned.
        const scheduleEndTs = state.anchorTs + state.schedule.reduce((s, seg) => s + seg.durationMs, 0);
        const finishedAt = state.status === 'running' ? Math.min(now, scheduleEndTs) : now;

        set((s) => ({
          status: 'ended',
          elapsedMs,
          msInPhase: position.msInPhase,
          focusMsCompleted: position.focusMsCompleted,
          breakMsCompleted: position.breakMsCompleted,
          finishedAt,
          coinsAwarded: earning.coins,
          coinsCapped: earning.capped,
          paidFocusMsToday: earning.nextDaily.paidFocusMsToday,
          paidFocusDay: earning.nextDaily.paidFocusDay,
          wallet: { coins: s.wallet.coins + earning.coins },
        }));

        // Fire-and-forget: recordSession never throws, and the runId-keyed
        // INSERT OR IGNORE makes a later retry (or replay) a no-op.
        void recordSession(sessionRecordFrom(get()));
      },

      abandonRun: (now = Date.now()) => {
        const state = get();
        if (state.status !== 'running' && state.status !== 'paused') return;

        set({ skipped: true });
        get().endRun(now);
        set({ ...IDLE_RUN });
      },

      reset: () => set({ ...IDLE_RUN }),

      tick: (now = Date.now()) => {
        const state = get();
        if (state.status !== 'running') return;

        const elapsedMs = elapsedAt(state, now);
        const position = resolvePosition(state.schedule, elapsedMs);

        if (position.finished) {
          get().endRun(now);
          return;
        }

        set(applyPosition(state, elapsedMs));
      },

      reconcileAfterRestart: (now = Date.now()) => {
        const state = get();

        if (state.status === 'running') {
          // Finished while the app was dead: settle up (coins + history row).
          // Otherwise the ticker resumes the live run untouched.
          if (resolvePosition(state.schedule, elapsedAt(state, now)).finished) {
            get().endRun(now);
          }
          return;
        }

        // Died between awarding coins and the DB write landing; replaying
        // the runId-keyed insert is a no-op when the row already exists.
        if (state.status === 'ended' && state.runId) {
          void recordSession(sessionRecordFrom(state));
        }
      },

      addCoins: (amount) =>
        set((s) => ({ wallet: { coins: Math.max(0, s.wallet.coins + amount) } })),

      fulfillPurchase: (transactionId, coins) => {
        if (!transactionId || coins <= 0) return false;
        const state = get();
        if (state.fulfilledPurchaseIds.includes(transactionId)) return false;
        set({
          wallet: { coins: state.wallet.coins + coins },
          fulfilledPurchaseIds: [...state.fulfilledPurchaseIds, transactionId],
        });
        return true;
      },

      unlockCompanion: (id) => {
        const state = get();
        const companion = state.companions.find((c) => c.id === id);
        if (!companion || companion.unlocked) return false;
        if (state.wallet.coins < companion.priceCoins) return false;

        set({
          wallet: { coins: state.wallet.coins - companion.priceCoins },
          companions: state.companions.map((c) =>
            c.id === id ? { ...c, unlocked: true } : c,
          ),
        });
        return true;
      },

      renameCompanion: (id, name) =>
        set((s) => ({
          companions: s.companions.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
    }),
    {
      name: 'capy-timer-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // The run slice is all absolute timestamps and durations, so a
      // rehydrated run lands exactly where the wall clock says it should.
      // Categories are owned by SQLite and reloaded on launch.
      partialize: (state) => ({
        plan: state.plan,
        wallet: state.wallet,
        companions: state.companions,
        isPremium: state.isPremium,
        paidFocusMsToday: state.paidFocusMsToday,
        paidFocusDay: state.paidFocusDay,
        fulfilledPurchaseIds: state.fulfilledPurchaseIds,
        runId: state.runId,
        status: state.status,
        phase: state.phase,
        loopIndex: state.loopIndex,
        msInPhase: state.msInPhase,
        elapsedMs: state.elapsedMs,
        focusMsCompleted: state.focusMsCompleted,
        breakMsCompleted: state.breakMsCompleted,
        anchorTs: state.anchorTs,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
        schedule: state.schedule,
        skipped: state.skipped,
        skippedFocusMs: state.skippedFocusMs,
        skippedBreakMs: state.skippedBreakMs,
        coinsAwarded: state.coinsAwarded,
        coinsCapped: state.coinsCapped,
      }),
      onRehydrateStorage: () => (state) => {
        state?.reconcileAfterRestart();
      },
    },
  ),
);
