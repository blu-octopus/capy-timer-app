import {
  formatMonthTitle,
  formatRangeLabel,
  lastNDaysRange,
  monthGrid,
  normalizeDayRange,
} from '@/src/utils/calendar';

function at(dateIso: string): number {
  return new Date(dateIso).getTime();
}

describe('monthGrid', () => {
  it('starts weeks on Monday and pads to whole weeks', () => {
    // March 2026 begins on a Sunday, so the first row leads with six
    // February days.
    const weeks = monthGrid(2026, 2);
    expect(weeks[0]!.map((d) => d.dayOfMonth)).toEqual([23, 24, 25, 26, 27, 28, 1]);
    expect(weeks[0]!.map((d) => d.inMonth)).toEqual([
      false, false, false, false, false, false, true,
    ]);
    for (const week of weeks) expect(week).toHaveLength(7);
  });

  it('handles leap February', () => {
    const weeks = monthGrid(2028, 1);
    const inMonthDays = weeks.flat().filter((d) => d.inMonth);
    expect(inMonthDays).toHaveLength(29);
    expect(inMonthDays[28]!.dayOfMonth).toBe(29);
  });

  it('anchors each cell at local midnight', () => {
    const someDay = monthGrid(2026, 5)[1]![3]!;
    const date = new Date(someDay.ts);
    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe('normalizeDayRange', () => {
  const mon = at('2026-03-09T00:00:00');
  const wed = at('2026-03-11T00:00:00');

  it('produces a half-open range covering both tapped days', () => {
    const range = normalizeDayRange(mon, wed);
    expect(range.start).toBe(mon);
    expect(range.end).toBe(at('2026-03-12T00:00:00'));
  });

  it('accepts taps in either order', () => {
    expect(normalizeDayRange(wed, mon)).toEqual(normalizeDayRange(mon, wed));
  });

  it('collapses a single tap to a one-day range', () => {
    const range = normalizeDayRange(mon, mon);
    expect(range.end - range.start).toBe(24 * 60 * 60 * 1000);
  });
});

describe('lastNDaysRange', () => {
  it('ends after today and reaches back n days inclusive', () => {
    const now = at('2026-03-11T15:30:00');
    const range = lastNDaysRange(7, now);
    expect(range.start).toBe(at('2026-03-05T00:00:00'));
    expect(range.end).toBe(at('2026-03-12T00:00:00'));
  });
});

describe('labels', () => {
  it('formats a month title', () => {
    expect(formatMonthTitle(2026, 2)).toBe('March 2026');
  });

  it('formats a multi-day range and collapses single days', () => {
    expect(formatRangeLabel(normalizeDayRange(at('2026-03-03T00:00:00'), at('2026-03-11T00:00:00')))).toBe(
      'Mar 3 – Mar 11',
    );
    expect(formatRangeLabel(normalizeDayRange(at('2026-03-03T00:00:00'), at('2026-03-03T00:00:00')))).toBe(
      'Mar 3',
    );
  });
});
