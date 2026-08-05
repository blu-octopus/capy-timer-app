import React, { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/src/theme/tokens';

export interface ProgressRingProps {
  /** 0-100. */
  value: number;
  size?: number;
  trackColor?: string;
  progressColor?: string;
}

const ANIMATION_MS = 600;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Wedge from 12 o'clock, clockwise. */
function wedgePath(center: number, radius: number, percent: number): string {
  if (percent >= 100) {
    // A 360° arc is degenerate; draw two half-circles instead.
    return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius} Z`;
  }

  const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;
  const x = center + radius * Math.cos(angle);
  const y = center + radius * Math.sin(angle);
  const largeArc = percent > 50 ? 1 : 0;

  return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`;
}

/**
 * A filled pie wedge rather than a stroked donut, matching the sessions
 * indicator in the design. An arc's `d` cannot be interpolated by the
 * animation system, so the percentage is stepped in JS and the path
 * recomputed each frame.
 */
export function ProgressRing({
  value,
  size = 12,
  trackColor = '#D9D9D9',
  progressColor = colors.greenPrimary,
}: ProgressRingProps) {
  const target = Math.max(0, Math.min(100, value));
  const [animated, setAnimated] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    const start = Date.now();
    const step = () => {
      const progress = Math.min(1, (Date.now() - start) / ANIMATION_MS);
      const next = from + (target - from) * easeOutCubic(progress);
      setAnimated(next);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      fromRef.current = target;
    };
  }, [target]);

  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={center} fill={trackColor} />
      {animated > 0 && <Path d={wedgePath(center, center, animated)} fill={progressColor} />}
    </Svg>
  );
}
