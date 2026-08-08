import type { Category, Session } from '@/src/db/schema';
import {
  focusByCategory,
  hourBuckets,
  streakMatrix,
  summarize,
  timeframeRange,
  toHoursMinutes,
} from '@/src/db/stats';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function at(dateIso: string): number {
  return new Date(dateIso).getTime();
}

function session(overrides: Partial<Session> & { id: string; startedAt: number }): Session {
  return {
    finishedAt: overrides.startedAt + 25 * MIN,
    plannedMs: 25 * MIN,
    focusMs: 25 * MIN,
    breakMs: 0,
    loops: 1,
    categoryId: null,
    companionId: null,
    coinsEarned: 0,
    skipped: 0,
    ...overrides,
  };
}

const categories: Category[] = [
  { id: 'study', name: 'study', color: 'green', createdAt: 0 },
  { id: 'workout', name: 'workout', color: 'blue', createdAt: 0 },
];

describe('timeframeRange', () => {
  // Wednesday.
  const now = at('2026-03-11T15:30:00');

  it('covers exactly the current day for today', () => {
    const { start, end } = timeframeRange('today', now);
    expect(new Date(start).getHours()).toBe(0);
    expect(end - start).toBe(24 * HOUR);
    expect(now).toBeGreaterThanOrEqual(start);
    expect(now).toBeLessThan(end);
  });

  it('starts the week on Monday', () => {
    const { start, end } = timeframeRange('week', now);
    expect(new Date(start).getDay()).toBe(1);
    expect(new Date(start).getDate()).toBe(9);
    expect(end - start).toBe(7 * 24 * HOUR);
  });

  it('spans the calendar month', () => {
    const { start, end } = timeframeRange('month', now);
    expect(new Date(start).getDate()).toBe(1);
    expect(new Date(start).getMonth()).toBe(2);
    expect(new Date(end).getMonth()).toBe(3);
  });

  it('falls back to today when custom has no range', () => {
    expect(timeframeRange('custom', now)).toEqual(timeframeRange('today', now));
  });
});

describe('summarize', () => {
  it('returns zeroes for no sessions', () => {
    expect(summarize([])).toEqual({
      total: 0,
      completed: 0,
      focusMs: 0,
      totalMs: 0,
      longestMs: 0,
      averageMs: 0,
    });
  });

  it('counts only finished, unskipped sessions as completed', () => {
    const result = summarize([
      session({ id: 'a', startedAt: at('2026-03-11T09:00:00') }),
      session({ id: 'b', startedAt: at('2026-03-11T10:00:00'), finishedAt: null }),
      session({ id: 'c', startedAt: at('2026-03-11T11:00:00'), skipped: 1 }),
    ]);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(1);
  });

  it('tracks the longest session by focus plus break', () => {
    const result = summarize([
      session({ id: 'a', startedAt: at('2026-03-11T09:00:00'), focusMs: 20 * MIN, breakMs: 5 * MIN }),
      session({ id: 'b', startedAt: at('2026-03-11T10:00:00'), focusMs: 50 * MIN, breakMs: 10 * MIN }),
    ]);
    expect(result.longestMs).toBe(60 * MIN);
    expect(result.focusMs).toBe(70 * MIN);
    expect(result.averageMs).toBe(Math.floor(85 * MIN / 2));
  });

  it('still counts elapsed time from a skipped session', () => {
    const result = summarize([
      session({ id: 'a', startedAt: at('2026-03-11T09:00:00'), focusMs: 7 * MIN, skipped: 1 }),
    ]);
    expect(result.focusMs).toBe(7 * MIN);
    expect(result.completed).toBe(0);
  });
});

describe('toHoursMinutes', () => {
  it('splits into whole hours and leftover minutes', () => {
    expect(toHoursMinutes(12 * HOUR + 40 * MIN)).toEqual({ hours: 12, minutes: 40 });
    expect(toHoursMinutes(45 * MIN)).toEqual({ hours: 0, minutes: 45 });
    expect(toHoursMinutes(0)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('hourBuckets', () => {
  it('averages sessions that start in the same hour', () => {
    const buckets = hourBuckets([
      session({ id: 'a', startedAt: at('2026-03-11T09:00:00'), focusMs: 20 * MIN, breakMs: 0 }),
      session({ id: 'b', startedAt: at('2026-03-11T09:45:00'), focusMs: 40 * MIN, breakMs: 0 }),
    ]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.hour).toBe(9);
    expect(buckets[0]!.value).toBe(30 * MIN);
  });

  it('omits hours with no sessions and sorts ascending', () => {
    const buckets = hourBuckets([
      session({ id: 'a', startedAt: at('2026-03-11T21:00:00') }),
      session({ id: 'b', startedAt: at('2026-03-11T09:00:00') }),
    ]);
    expect(buckets.map((b) => b.hour)).toEqual([9, 21]);
  });

  it('labels hours in 12-hour form', () => {
    const buckets = hourBuckets([
      session({ id: 'a', startedAt: at('2026-03-11T00:30:00') }),
      session({ id: 'b', startedAt: at('2026-03-11T12:30:00') }),
      session({ id: 'c', startedAt: at('2026-03-11T21:00:00') }),
    ]);
    expect(buckets.map((b) => b.label)).toEqual(['12am', '12pm', '9pm']);
  });
});

describe('focusByCategory', () => {
  it('ranks categories by focus time with percentages', () => {
    const slices = focusByCategory(
      [
        session({ id: 'a', startedAt: at('2026-03-11T09:00:00'), categoryId: 'study', focusMs: 75 * MIN }),
        session({ id: 'b', startedAt: at('2026-03-11T10:00:00'), categoryId: 'workout', focusMs: 25 * MIN }),
      ],
      categories,
    );
    expect(slices.map((s) => [s.label, s.percent])).toEqual([
      ['study', 75],
      ['workout', 25],
    ]);
    expect(slices[0]!.color).toBe('green');
  });

  it('groups untagged and unknown categories as others', () => {
    const slices = focusByCategory(
      [
        session({ id: 'a', startedAt: at('2026-03-11T09:00:00'), categoryId: null, focusMs: 10 * MIN }),
        session({ id: 'b', startedAt: at('2026-03-11T10:00:00'), categoryId: 'deleted', focusMs: 10 * MIN }),
      ],
      categories,
    );
    expect(slices).toHaveLength(1);
    expect(slices[0]!.label).toBe('others');
    expect(slices[0]!.focusMs).toBe(20 * MIN);
  });

  it('returns nothing when no focus time was logged', () => {
    expect(focusByCategory([], categories)).toEqual([]);
    expect(
      focusByCategory(
        [session({ id: 'a', startedAt: at('2026-03-11T09:00:00'), focusMs: 0 })],
        categories,
      ),
    ).toEqual([]);
  });
});

describe('streakMatrix', () => {
  const range = timeframeRange('week', at('2026-03-11T15:30:00'));

  it('marks a day when that category had a finished session', () => {
    const rows = streakMatrix(
      [
        // Monday and Wednesday.
        session({ id: 'a', startedAt: at('2026-03-09T09:00:00'), categoryId: 'study' }),
        session({ id: 'b', startedAt: at('2026-03-11T09:00:00'), categoryId: 'study' }),
      ],
      categories,
      range,
    );
    const study = rows.find((r) => r.categoryId === 'study')!;
    expect(study.checked).toEqual([true, false, true, false, false, false, false]);
  });

  it('ignores unfinished and skipped sessions', () => {
    const rows = streakMatrix(
      [
        session({ id: 'a', startedAt: at('2026-03-09T09:00:00'), categoryId: 'study', finishedAt: null }),
        session({ id: 'b', startedAt: at('2026-03-10T09:00:00'), categoryId: 'study', skipped: 1 }),
      ],
      categories,
      range,
    );
    expect(rows.find((r) => r.categoryId === 'study')!.checked).toEqual(
      Array(7).fill(false),
    );
  });

  it('produces a row per category with one cell per day', () => {
    const rows = streakMatrix([], categories, range);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.checked.length === 7)).toBe(true);
  });
});
