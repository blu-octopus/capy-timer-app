import { insertSession } from './repository';
import type { NewSession } from './schema';

/**
 * Writes a finished run to history. Failures are logged rather than thrown:
 * losing a history row is regrettable, but it must never break the
 * completion screen or swallow the coins the user just earned.
 */
export async function recordSession(session: NewSession): Promise<void> {
  try {
    await insertSession(session);
  } catch (error) {
    console.warn('[sessions] could not record session', error);
  }
}

export function newSessionId(): string {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
