import type { DateRange } from '../db/stats';

/**
 * Pure calendar math for the custom date-range picker. All day boundaries
 * come from `new Date(y, m, d)` constructors rather than DAY_MS arithmetic,
 * so DST transitions can't shift a midnight.
 */

export interface CalendarDay {
  /** Local midnight of this day. */
  ts: number;
  dayOfMonth: number;
  /** False for the leading/trailing days padding the grid to full weeks. */
  inMonth: boolean;
}

/** Monday-first week grid covering the given month, padded to whole weeks. */
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((lead + daysInMonth) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    const date = new Date(year, month, 1 + cell - lead);
    if (cell % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]!.push({
      ts: date.getTime(),
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
    });
  }
  return weeks;
}

/** Half-open [start, end) range spanning two tapped days, in either order. */
export function normalizeDayRange(aTs: number, bTs: number): DateRange {
  const start = Math.min(aTs, bTs);
  const last = new Date(Math.max(aTs, bTs));
  return {
    start,
    end: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime(),
  };
}

/** The trailing n days ending today, as a half-open range. */
export function lastNDaysRange(n: number, now: number): DateRange {
  const today = new Date(now);
  return {
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1)).getTime(),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime(),
  };
}

export function formatMonthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** "Mar 3 – Mar 11", collapsing to a single date for one-day ranges. */
export function formatRangeLabel(range: DateRange): string {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const startLabel = fmt(range.start);
  // end is exclusive; the range's last day is just before it.
  const endLabel = fmt(range.end - 1);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}
