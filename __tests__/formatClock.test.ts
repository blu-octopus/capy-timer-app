import { formatClock } from '@/src/theme/formatClock';

describe('formatClock', () => {
  it('renders MM:SS below an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(59)).toBe('00:59');
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('switches to H:MM:SS at an hour', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3661)).toBe('1:01:01');
    expect(formatClock(45296)).toBe('12:34:56');
  });

  it('keeps a fixed digit count so the layout never shifts', () => {
    // Minutes and seconds stay padded even when small.
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3605)).toBe('1:00:05');
  });

  it('clamps negatives and truncates fractions', () => {
    expect(formatClock(-10)).toBe('00:00');
    expect(formatClock(59.9)).toBe('00:59');
  });
});
