import type { AppState } from '@/src/store';
import { resolvePosition } from '@/src/store/types';

export interface WidgetSnapshot {
  status: 'idle' | 'running' | 'paused' | 'ended';
  phase: 'prep' | 'focus' | 'break' | null;
  phaseLabel: string;
  loopIndex: number;
  totalLoops: number;
  companionId: string;
  /** Absolute epoch ms when the current phase ends; null when not running. */
  phaseEndAt: number | null;
  /** When this snapshot was computed, so a stale read is self-describing. */
  updatedAt: number;
}

const PHASE_LABEL: Record<'prep' | 'focus' | 'break', string> = {
  prep: 'Prep Time',
  focus: 'Focus Time',
  break: 'Break Time',
};

/**
 * Pure snapshot of what a widget needs to render, independent of any
 * platform bridge. The widget itself never runs app JS, so this is computed
 * once per meaningful transition and handed to native storage — see
 * `useWidgetSync`.
 */
export function buildWidgetSnapshot(state: AppState, now: number): WidgetSnapshot {
  const { status, plan, loopIndex } = state;

  if (status === 'idle' || status === 'ended' || state.schedule.length === 0) {
    return {
      status,
      phase: null,
      phaseLabel: status === 'ended' ? 'Session complete' : 'Ready to focus',
      loopIndex: 0,
      totalLoops: plan.loops,
      companionId: plan.companionId,
      phaseEndAt: null,
      updatedAt: now,
    };
  }

  const position = resolvePosition(state.schedule, state.elapsedMs);
  const segment = position.segment;

  // anchorTs is the run's start time shifted forward by any paused stretches,
  // so segment end offset + anchorTs is the phase's real wall-clock end —
  // exactly what a widget needs to tick down on its own.
  const phaseEndAt =
    status === 'running' && segment ? state.anchorTs + segment.offsetMs + segment.durationMs : null;

  return {
    status,
    phase: segment?.phase ?? null,
    phaseLabel: segment ? PHASE_LABEL[segment.phase] : 'Ready to focus',
    loopIndex,
    totalLoops: plan.loops,
    companionId: plan.companionId,
    phaseEndAt,
    updatedAt: now,
  };
}
