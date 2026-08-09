/**
 * A whole-session length in prose: "45 min", "1 hr", "1 hr 30 min".
 *
 * Unlike {@link formatClock}, nothing here is zero-padded and the units are
 * spelled out — this reads as a sentence ("egg session · 1 hr 30 min"), not
 * as a running clock, so a shifting digit count costs nothing and the extra
 * width of "hr"/"min" is what makes it scannable at a glance.
 */
export function formatDuration(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
