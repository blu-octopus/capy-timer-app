/**
 * Guards the sketch engine ported verbatim from capy-ui. These properties are
 * what the whole hand-drawn look depends on: same seed must always produce the
 * same shape (otherwise borders shimmer on every re-render), and closed ribbons
 * must stay two-subpath annuli (otherwise evenodd fill leaves a seam).
 */

import { roundedRectBoundary, generateWobbleRibbon, mulberry32, smoothNoise1D } from '@/src/sketch';

describe('noise', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });

  it('keeps smooth noise within roughly [-1, 1]', () => {
    const noise = smoothNoise1D(7, 0.05);
    for (let t = 0; t < 200; t += 3) {
      expect(Math.abs(noise(t))).toBeLessThanOrEqual(1);
    }
  });
});

describe('roundedRectBoundary', () => {
  it('samples a closed loop with outward unit normals', () => {
    const boundary = roundedRectBoundary(100, 60, 12);
    expect(boundary.length).toBeGreaterThan(0);

    for (const s of boundary) {
      const magnitude = Math.hypot(s.nx, s.ny);
      expect(magnitude).toBeCloseTo(1, 5);
    }
  });

  it('advances arc-length monotonically', () => {
    const boundary = roundedRectBoundary(100, 60, 12);
    for (let i = 1; i < boundary.length; i++) {
      expect(boundary[i]!.t).toBeGreaterThanOrEqual(boundary[i - 1]!.t);
    }
  });
});

describe('generateWobbleRibbon', () => {
  const boundary = roundedRectBoundary(100, 60, 12);
  const options = { seed: 5, halfWidth: 0.75, wiggle: 1, frequency: 0.05, widthVariance: 0.5 };

  it('is deterministic for a given seed', () => {
    const a = generateWobbleRibbon(boundary, options);
    const b = generateWobbleRibbon(boundary, options);
    expect(a.ribbonPath).toEqual(b.ribbonPath);
  });

  it('changes shape when the seed changes', () => {
    const a = generateWobbleRibbon(boundary, options);
    const b = generateWobbleRibbon(boundary, { ...options, seed: 6 });
    expect(a.ribbonPath).not.toEqual(b.ribbonPath);
  });

  it('emits two closed subpaths so evenodd fill renders an annulus', () => {
    const { ribbonPath } = generateWobbleRibbon(boundary, options);
    // Two "M" commands = outer loop + inner loop, each independently closed.
    expect(ribbonPath.match(/M/g)).toHaveLength(2);
    expect(ribbonPath.match(/Z/gi)).toHaveLength(2);
  });

  it('keeps outer and inner edges point-for-point aligned', () => {
    const { outer, inner } = generateWobbleRibbon(boundary, options);
    expect(outer).toHaveLength(inner.length);
    expect(outer.length).toBe(boundary.length);
  });

  it('offsets outer and inner away from each other by roughly the ribbon width', () => {
    const { outer, inner } = generateWobbleRibbon(boundary, options);
    for (let i = 0; i < outer.length; i += 10) {
      const width = Math.hypot(outer[i]!.x - inner[i]!.x, outer[i]!.y - inner[i]!.y);
      // halfWidth 0.75 with variance 0.5 => full width lands in ~[0.75, 2.25].
      expect(width).toBeGreaterThan(0.5);
      expect(width).toBeLessThan(2.5);
    }
  });
});
