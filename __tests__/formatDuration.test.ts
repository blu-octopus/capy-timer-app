import { formatDuration } from '@/src/theme/formatDuration';

describe('formatDuration', () => {
  it('shows plain minutes below an hour', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(15)).toBe('15 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('drops the minutes when a duration lands on a whole hour', () => {
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(120)).toBe('2 hr');
  });

  it('shows both parts for a mixed duration, unpadded', () => {
    expect(formatDuration(90)).toBe('1 hr 30 min');
    // 5 rather than 05 — this reads as prose, not as a clock.
    expect(formatDuration(65)).toBe('1 hr 5 min');
  });

  it('treats a negative length as zero rather than rendering a minus sign', () => {
    expect(formatDuration(-10)).toBe('0 min');
  });

  it('rounds fractional minutes', () => {
    expect(formatDuration(14.4)).toBe('14 min');
    expect(formatDuration(14.6)).toBe('15 min');
  });
});
