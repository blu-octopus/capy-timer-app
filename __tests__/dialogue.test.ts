/**
 * The speech bubble is meant to orient someone in their own session without
 * making them read the clock, so these tests care most about whether a line
 * is *true* at the moment it appears — the right minutes, the right loop —
 * not about its wording.
 */

import { dialogueFor, type DialogueContext } from '@/src/theme/messages';

const MINUTE = 60_000;

function ctx(overrides: Partial<DialogueContext> = {}): DialogueContext {
  return {
    status: 'running',
    phase: 'focus',
    progress: 0.3,
    msRemainingInPhase: 14 * MINUTE,
    loop: 1,
    totalLoops: 2,
    bucket: 0,
    ...overrides,
  };
}

describe('dialogueFor', () => {
  it('announces the halfway mark with the minutes actually left', () => {
    const line = dialogueFor(ctx({ progress: 0.5, msRemainingInPhase: 10 * MINUTE }));

    expect(line).toContain('Halfway');
    expect(line).toContain('10 minutes');
  });

  it('says the final minute differently on the last loop', () => {
    const lastLoop = dialogueFor(
      ctx({ progress: 0.98, msRemainingInPhase: 30_000, loop: 2, totalLoops: 2 }),
    );
    const midRun = dialogueFor(
      ctx({ progress: 0.98, msRemainingInPhase: 30_000, loop: 1, totalLoops: 2 }),
    );

    expect(lastLoop).toBe('Last minute. Finish strong.');
    expect(midRun).toBe('Almost at the break.');
  });

  it('names which loop is starting when there is more than one', () => {
    expect(dialogueFor(ctx({ progress: 0.01, loop: 2, totalLoops: 3 }))).toBe(
      'Loop 2 of 3. Here we go.',
    );
  });

  it('does not mention loops in a single-loop session', () => {
    expect(dialogueFor(ctx({ progress: 0.01, loop: 1, totalLoops: 1 }))).not.toContain('Loop');
  });

  it('tells the user what comes after the break', () => {
    const line = dialogueFor(
      ctx({ phase: 'break', progress: 0.95, msRemainingInPhase: 40_000, loop: 1, totalLoops: 3 }),
    );

    expect(line).toContain('loop 2');
  });

  it('knows when the break is the last one', () => {
    const line = dialogueFor(
      ctx({ phase: 'break', progress: 0.95, msRemainingInPhase: 40_000, loop: 3, totalLoops: 3 }),
    );

    expect(line).toBe('Nearly done for today.');
  });

  it('rounds minutes up so it never claims "0 minutes left"', () => {
    const line = dialogueFor(ctx({ progress: 0.8, msRemainingInPhase: 4_000 }));

    expect(line).not.toContain('0 minute');
  });

  it('says minute, singular, when one is left', () => {
    const line = dialogueFor(ctx({ progress: 0.8, msRemainingInPhase: 62_000 }));

    expect(line).toContain('1 minute');
    expect(line).not.toContain('1 minutes');
  });

  it('speaks in idle and paused, which used to show nothing and "..."', () => {
    expect(dialogueFor(ctx({ status: 'idle' }))).toBeTruthy();
    expect(dialogueFor(ctx({ status: 'paused' }))).toBeTruthy();
    expect(dialogueFor(ctx({ status: 'paused' }))).not.toBe('...');
  });

  it('rotates idle and paused lines across buckets, having no progress to key off', () => {
    const paused = [0, 1, 2, 3].map((bucket) => dialogueFor(ctx({ status: 'paused', bucket })));

    expect(new Set(paused).size).toBeGreaterThan(1);
  });

  it('holds one line steady within a bucket', () => {
    const a = dialogueFor(ctx({ progress: 0.3, bucket: 5 }));
    const b = dialogueFor(ctx({ progress: 0.31, bucket: 5 }));

    expect(a).toBe(b);
  });

  it('handles a zero-length phase without dividing by zero', () => {
    expect(() => dialogueFor(ctx({ progress: 0, msRemainingInPhase: 0 }))).not.toThrow();
  });

  it('covers every phase', () => {
    for (const phase of ['prep', 'focus', 'break'] as const) {
      expect(dialogueFor(ctx({ phase }))).toBeTruthy();
    }
  });
});
