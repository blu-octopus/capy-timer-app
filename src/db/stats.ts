import type { Session } from './schema';

/**
 * The analytics only need a tag's identity and presentation — not when it was
 * created — so both the database row and the store's cached shape satisfy it.
 */
export interface CategoryLike {
  id: string;
  name: string;
  color: string;
}

export type Timeframe = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  start: number;
  end: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Window for a dashboard tab. Week starts Monday to match the streak grid's
 * M-through-Sunday columns. `end` is exclusive.
 */
export function timeframeRange(
  timeframe: Timeframe,
  now: number,
  custom?: DateRange,
): DateRange {
  const todayStart = startOfDay(now);

  switch (timeframe) {
    case 'today':
      return { start: todayStart, end: todayStart + DAY_MS };
    case 'week': {
      // getDay(): 0=Sunday. Shift so Monday is the first column.
      const weekday = (new Date(todayStart).getDay() + 6) % 7;
      const start = todayStart - weekday * DAY_MS;
      return { start, end: start + 7 * DAY_MS };
    }
    case 'month': {
      const d = new Date(todayStart);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return { start, end };
    }
    case 'custom':
      return custom ?? { start: todayStart, end: todayStart + DAY_MS };
  }
}

export interface Summary {
  /** Sessions started in range, including ones ended early. */
  total: number;
  completed: number;
  focusMs: number;
  totalMs: number;
  longestMs: number;
  averageMs: number;
}

export function summarize(sessions: Session[]): Summary {
  if (sessions.length === 0) {
    return { total: 0, completed: 0, focusMs: 0, totalMs: 0, longestMs: 0, averageMs: 0 };
  }

  let focusMs = 0;
  let totalMs = 0;
  let longestMs = 0;
  let completed = 0;

  for (const s of sessions) {
    const sessionMs = s.focusMs + s.breakMs;
    focusMs += s.focusMs;
    totalMs += sessionMs;
    if (sessionMs > longestMs) longestMs = sessionMs;
    if (s.finishedAt != null && !s.skipped) completed++;
  }

  return {
    total: sessions.length,
    completed,
    focusMs,
    totalMs,
    longestMs,
    averageMs: Math.floor(totalMs / sessions.length),
  };
}

/** Splits milliseconds into whole hours and leftover minutes for the stat cards. */
export function toHoursMinutes(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.floor(ms / 60000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

export interface HourBucket {
  /** Hour of day, 0-23. */
  hour: number;
  /** Mean session length in that hour, in ms — the chart plots averages. */
  value: number;
  label?: string;
}

/**
 * Average session length grouped by start hour, for the bar chart. Only hours
 * with sessions appear, so an idle day doesn't render 24 empty bars.
 */
export function hourBuckets(sessions: Session[]): HourBucket[] {
  const totals = new Map<number, { sum: number; count: number }>();

  for (const s of sessions) {
    const hour = new Date(s.startedAt).getHours();
    const entry = totals.get(hour) ?? { sum: 0, count: 0 };
    entry.sum += s.focusMs + s.breakMs;
    entry.count++;
    totals.set(hour, entry);
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, { sum, count }]) => ({
      hour,
      value: Math.floor(sum / count),
      label: formatHourLabel(hour),
    }));
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export interface CategorySlice {
  categoryId: string | null;
  label: string;
  color: string;
  focusMs: number;
  percent: number;
}

const UNCATEGORIZED_COLOR = 'grey';

/**
 * Focus time per category, largest first, for the pie chart and the
 * "most common tag" card.
 */
export function focusByCategory(sessions: Session[], categories: CategoryLike[]): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string | null, number>();

  for (const s of sessions) {
    const key = s.categoryId && byId.has(s.categoryId) ? s.categoryId : null;
    totals.set(key, (totals.get(key) ?? 0) + s.focusMs);
  }

  const grandTotal = [...totals.values()].reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return [];

  return [...totals.entries()]
    .map(([categoryId, focusMs]) => {
      const category = categoryId ? byId.get(categoryId) : undefined;
      return {
        categoryId,
        label: category?.name ?? 'others',
        color: category?.color ?? UNCATEGORIZED_COLOR,
        focusMs,
        percent: Math.round((focusMs / grandTotal) * 100),
      };
    })
    .sort((a, b) => b.focusMs - a.focusMs);
}

export interface StreakRow {
  categoryId: string;
  label: string;
  /** One entry per day in the window, in column order. */
  checked: boolean[];
}

/**
 * Per-category completion grid: did this category get at least one finished
 * session on each day of the window?
 */
export function streakMatrix(
  sessions: Session[],
  categories: CategoryLike[],
  range: DateRange,
): StreakRow[] {
  const dayCount = Math.max(1, Math.round((range.end - range.start) / DAY_MS));

  return categories.map((category) => {
    const checked = Array.from({ length: dayCount }, () => false);

    for (const s of sessions) {
      if (s.categoryId !== category.id) continue;
      if (s.finishedAt == null || s.skipped) continue;

      const dayIndex = Math.floor((startOfDay(s.startedAt) - range.start) / DAY_MS);
      if (dayIndex >= 0 && dayIndex < dayCount) checked[dayIndex] = true;
    }

    return { categoryId: category.id, label: category.name, checked };
  });
}
