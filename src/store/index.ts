import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildSchedule,
  coinsForFocusMs,
  resolvePosition,
  totalPlanMs,
  type CategoryItem,
  type Companion,
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
  schedule: PhaseSegment[];
  skipped: boolean;
  /** Unworked focus/break time jumped over by skips; earns nothing. */
  skippedFocusMs: number;
  skippedBreakMs: number;
  coinsAwarded: number;
}

const IDLE_RUN: RunState = {
  status: 'idle',
  phase: 'focus',
  loopIndex: 0,
  msInPhase: 0,
  elapsedMs: 0,
  focusMsCompleted: 0,
  breakMsCompleted: 0,
  anchorTs: 0,
  startedAt: 0,
  schedule: [],
  skipped: false,
  skippedFocusMs: 0,
  skippedBreakMs: 0,
  coinsAwarded: 0,
};

export interface AppState extends RunState {
  plan: SessionPlan;
  wallet: { coins: number };
  companions: Companion[];
  categories: CategoryItem[];

  updatePlan: (updates: Partial<SessionPlan>) => void;
  setCategories: (categories: CategoryItem[]) => void;

  startRun: (now?: number) => void;
  pause: (now?: number) => void;
  resume: (now?: number) => void;
  /** Jump to the next phase, or end the run if this was the last. */
  skipPhase: (now?: number) => void;
  endRun: (now?: number) => void;
  reset: () => void;
  /** Reconciles state against the wall clock; safe to call at any cadence. */
  tick: (now?: number) => void;

  addCoins: (amount: number) => void;
  unlockCompanion: (id: string) => boolean;
  renameCompanion: (id: string, name: string) => void;
}

/** Milliseconds of run progress at time `now`, given the anchor. */
function elapsedAt(state: RunState, now: number): number {
  return Math.max(0, now - state.anchorTs);
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

      updatePlan: (updates) => set((s) => ({ plan: { ...s.plan, ...updates } })),
      setCategories: (categories) => set({ categories }),

      startRun: (now = Date.now()) => {
        const { plan } = get();
        const schedule = buildSchedule(plan);
        set({
          ...IDLE_RUN,
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
        // Freeze progress; resume re-anchors so paused time never counts.
        set({ ...applyPosition(state, elapsedAt(state, now)), status: 'paused' });
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
        const isLast = nextOffset >= totalPlanMs(state.plan);

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
        // never for focus time that was skipped over.
        const coins = coinsForFocusMs(
          Math.max(0, position.focusMsCompleted - state.skippedFocusMs),
        );

        set((s) => ({
          status: 'ended',
          elapsedMs,
          msInPhase: position.msInPhase,
          focusMsCompleted: position.focusMsCompleted,
          breakMsCompleted: position.breakMsCompleted,
          coinsAwarded: coins,
          wallet: { coins: s.wallet.coins + coins },
        }));
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

      addCoins: (amount) =>
        set((s) => ({ wallet: { coins: Math.max(0, s.wallet.coins + amount) } })),

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
      storage: createJSONStorage(() => AsyncStorage),
      // Run state is wall-clock derived and meaningless after a cold start.
      // Categories are owned by SQLite and reloaded on launch.
      partialize: (state) => ({
        plan: state.plan,
        wallet: state.wallet,
        companions: state.companions,
      }),
    },
  ),
);
