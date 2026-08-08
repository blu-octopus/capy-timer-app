export type RunStatus = 'idle' | 'running' | 'paused' | 'ended';
export type RunPhase = 'prep' | 'focus' | 'break';
export type CountDirection = 'up' | 'down';

export const PREP_MS = 5 * 60 * 1000;

export interface SessionPlan {
  focusMin: number;
  breakMin: number;
  /** Number of focus+break cycles. */
  loops: number;
  prepEnabled: boolean;
  /** Display only — does not affect when a phase ends. */
  countDirection: CountDirection;
  categoryId?: string;
  companionId: string;
}

export interface Companion {
  id: string;
  name: string;
  unlocked: boolean;
  priceCoins: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
}

/**
 * A phase boundary in a planned run. Precomputing the whole schedule keeps
 * "where should we be at time T?" a lookup rather than a simulation, which
 * is what makes catching up after backgrounding cheap and exact.
 */
export interface PhaseSegment {
  phase: RunPhase;
  loopIndex: number;
  /** Milliseconds from run start to this phase's start. */
  offsetMs: number;
  durationMs: number;
}

export function buildSchedule(plan: SessionPlan): PhaseSegment[] {
  const segments: PhaseSegment[] = [];
  let offsetMs = 0;

  if (plan.prepEnabled) {
    segments.push({ phase: 'prep', loopIndex: 0, offsetMs, durationMs: PREP_MS });
    offsetMs += PREP_MS;
  }

  const focusMs = Math.max(0, plan.focusMin) * 60 * 1000;
  const breakMs = Math.max(0, plan.breakMin) * 60 * 1000;
  const loops = Math.max(1, plan.loops);

  // Every loop is a full focus + break cycle, including the last: the design
  // totals 20 min focus / 10 min break / 2 loops as a flat hour.
  for (let loopIndex = 0; loopIndex < loops; loopIndex++) {
    segments.push({ phase: 'focus', loopIndex, offsetMs, durationMs: focusMs });
    offsetMs += focusMs;

    if (breakMs > 0) {
      segments.push({ phase: 'break', loopIndex, offsetMs, durationMs: breakMs });
      offsetMs += breakMs;
    }
  }

  return segments;
}

export function totalPlanMs(plan: SessionPlan): number {
  return buildSchedule(plan).reduce((sum, s) => sum + s.durationMs, 0);
}

export function totalPlanMinutes(plan: SessionPlan): number {
  return Math.round(totalPlanMs(plan) / 60000);
}

export interface SchedulePosition {
  segment: PhaseSegment | null;
  /** Elapsed within the current phase. */
  msInPhase: number;
  /** True once elapsed passes the end of the last phase. */
  finished: boolean;
  focusMsCompleted: number;
  breakMsCompleted: number;
}

/**
 * Resolves elapsed run time to a position in the schedule. Because this is a
 * pure function of elapsed time, a run that was backgrounded for an hour
 * lands in exactly the same state as one that ticked the whole way.
 */
export function resolvePosition(schedule: PhaseSegment[], elapsedMs: number): SchedulePosition {
  let focusMsCompleted = 0;
  let breakMsCompleted = 0;

  for (const segment of schedule) {
    const endMs = segment.offsetMs + segment.durationMs;

    if (elapsedMs < endMs) {
      const msInPhase = Math.max(0, elapsedMs - segment.offsetMs);
      if (segment.phase === 'focus') focusMsCompleted += msInPhase;
      if (segment.phase === 'break') breakMsCompleted += msInPhase;
      return { segment, msInPhase, finished: false, focusMsCompleted, breakMsCompleted };
    }

    if (segment.phase === 'focus') focusMsCompleted += segment.durationMs;
    if (segment.phase === 'break') breakMsCompleted += segment.durationMs;
  }

  const last = schedule[schedule.length - 1] ?? null;
  return {
    segment: last,
    msInPhase: last?.durationMs ?? 0,
    finished: true,
    focusMsCompleted,
    breakMsCompleted,
  };
}

/**
 * Coins are earned per whole minute of completed focus time. Break time and
 * prep pay nothing, so the reward tracks actual work.
 */
export function coinsForFocusMs(focusMs: number): number {
  return Math.floor(focusMs / 60000);
}
