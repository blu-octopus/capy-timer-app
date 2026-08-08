import type { RunPhase } from '@/src/store/types';

/** Rotating encouragement shown in the capybara's speech bubble. */
const MESSAGES: Record<RunPhase, string[]> = {
  prep: ['Get comfy.', 'One breath in.', 'Ready when you are.'],
  focus: ["Don't give up!", 'Stay with it.', 'Tiny steps count.', 'You got this.'],
  break: ['Stretch break!', 'Sip some water.', 'Blink slowly.', 'Nice reset.'],
};

export function messageFor(phase: RunPhase, index: number): string {
  const list = MESSAGES[phase];
  return list[index % list.length]!;
}

/** How long each message stays up before rotating. */
export const MESSAGE_INTERVAL_MS = 9000;
