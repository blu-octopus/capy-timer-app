import type { RunPhase, RunStatus } from '@/src/store/types';

/**
 * What the capybara says, chosen from where the run actually is rather than
 * from a blind rotation.
 *
 * The point of the speech bubble is to keep someone oriented in their own
 * session without making them read the clock — so a line either tells them
 * something true about their time (how far in, how much is left, which loop)
 * or encourages them at a moment that earns it. Purely decorative filler is
 * the fallback, not the default.
 */

export interface DialogueContext {
  status: RunStatus;
  phase: RunPhase;
  /** 0..1 through the current phase. */
  progress: number;
  msRemainingInPhase: number;
  /** 1-based, for display. */
  loop: number;
  totalLoops: number;
  /**
   * Monotonic counter that advances once per DIALOGUE_BUCKET_MS. Rotates the
   * non-milestone lines, and is what keeps a paused or idle capybara from
   * repeating one string forever — neither has progress to key off.
   */
  bucket: number;
}

/**
 * How often the bubble may change its mind. Callers derive `bucket` from this
 * rather than passing raw elapsed time, so the run ticker's 250ms cadence
 * doesn't re-render the bubble four times a second.
 */
export const DIALOGUE_BUCKET_MS = 10_000;

function minutesLeft(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Filler for stretches where there's nothing specific worth saying. */
const FOCUS_FILLER = [
  'Nice and steady.',
  'One thing at a time.',
  'Tiny steps count.',
  "I'm right here.",
  'Still with you.',
];

const BREAK_FILLER = [
  'Look out a window.',
  'Roll your shoulders.',
  'Sip some water.',
  'Blink slowly.',
];

const PREP_FILLER = ['Get comfy.', 'One breath in.', 'No rush.'];

const IDLE_LINES = [
  'Ready when you are.',
  'What are we working on?',
  "Let's do a little.",
  'Pick a length and go.',
];

const PAUSED_LINES = [
  'Waiting right here.',
  'Take your time.',
  'Still paused.',
  'Come back when you can.',
];

/**
 * Picks a line from `pool` that changes as `seed` advances, so a stretch with
 * no milestone still feels alive without ever flickering mid-bucket.
 */
function rotate(pool: readonly string[], seed: number): string {
  return pool[Math.abs(Math.floor(seed)) % pool.length]!;
}

function focusLine(ctx: DialogueContext, seed: number): string {
  const { progress, msRemainingInPhase, loop, totalLoops } = ctx;
  const left = minutesLeft(msRemainingInPhase);
  const isLastLoop = loop === totalLoops;

  // Milestones first — these are the lines that actually inform.
  if (progress < 0.08) {
    return totalLoops > 1 && loop > 1
      ? `Loop ${loop} of ${totalLoops}. Here we go.`
      : "Let's begin. I'll keep time.";
  }
  if (progress >= 0.45 && progress < 0.58) {
    return `Halfway — ${left} ${plural(left, 'minute', 'minutes')} to go.`;
  }
  if (msRemainingInPhase <= 60_000) {
    return isLastLoop ? 'Last minute. Finish strong.' : 'Almost at the break.';
  }
  if (progress >= 0.75) {
    return `${left} ${plural(left, 'minute', 'minutes')} left. Nearly there.`;
  }

  // Between milestones, alternate encouragement with a quiet time check so
  // the bubble stays useful without nagging.
  if (seed % 3 === 2) {
    return `${left} ${plural(left, 'minute', 'minutes')} of focus left.`;
  }
  return rotate(FOCUS_FILLER, seed);
}

function breakLine(ctx: DialogueContext, seed: number): string {
  const { progress, msRemainingInPhase, loop, totalLoops } = ctx;
  const left = minutesLeft(msRemainingInPhase);

  if (progress < 0.12) {
    return 'Break time. Stand up if you can.';
  }
  if (msRemainingInPhase <= 60_000) {
    return loop >= totalLoops
      ? 'Nearly done for today.'
      : `Back to focus in a minute — loop ${loop + 1} next.`;
  }
  if (progress >= 0.7) {
    return `${left} ${plural(left, 'minute', 'minutes')} of break left.`;
  }
  return rotate(BREAK_FILLER, seed);
}

function prepLine(ctx: DialogueContext, seed: number): string {
  if (ctx.msRemainingInPhase <= 60_000) return 'Starting in a minute.';
  return rotate(PREP_FILLER, seed);
}

/**
 * The capybara's current line. Pure, so the bubble can be tested directly
 * against a point in a run rather than by waiting on a timer.
 */
export function dialogueFor(ctx: DialogueContext): string {
  const seed = ctx.bucket;

  if (ctx.status === 'idle') return rotate(IDLE_LINES, seed);
  if (ctx.status === 'ended') return 'You did it!';
  if (ctx.status === 'paused') return rotate(PAUSED_LINES, seed);

  switch (ctx.phase) {
    case 'focus':
      return focusLine(ctx, seed);
    case 'break':
      return breakLine(ctx, seed);
    case 'prep':
      return prepLine(ctx, seed);
  }
}
