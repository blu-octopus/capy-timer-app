import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { generateWobbleRibbon, roundedRectBoundary } from '@/src/sketch';
import { stroke } from '@/src/theme/tokens';

export interface WobbleBorderProps {
  width: number;
  height: number;
  radius: number;
  /** Fixed per component so the wobble pattern stays stable across renders. */
  seed: number;
  strokeWidth?: number;
  color?: string;
  frequency?: number;
  wiggle?: number;
  smoothen?: number;
  widthVariance?: number;
}

/**
 * Hand-drawn outline overlaying a parent's own background. Draws only the
 * ribbon — the parent supplies its fill.
 *
 * Unlike the web original, the SVG is padded rather than relying on
 * `overflow: visible`, which Android's SVG renderer clips inconsistently.
 */
export function WobbleBorder({
  width,
  height,
  radius,
  seed,
  strokeWidth = stroke.width,
  color = stroke.color,
  frequency = stroke.frequency,
  wiggle = stroke.wiggle,
  smoothen = 0.5,
  widthVariance = stroke.widthVariance,
}: WobbleBorderProps) {
  // Room for the wobble to swing outside the nominal box without being clipped.
  const pad = Math.ceil(strokeWidth + wiggle * 2);

  const ribbonPath = useMemo(() => {
    if (width <= 0 || height <= 0) return null;

    const boundary = roundedRectBoundary(
      Math.max(width - strokeWidth, 1),
      Math.max(height - strokeWidth, 1),
      radius,
    );

    return generateWobbleRibbon(boundary, {
      seed,
      frequency,
      wiggle,
      smoothen,
      halfWidth: strokeWidth / 2,
      widthVariance,
      closed: true,
    }).ribbonPath;
  }, [width, height, radius, seed, strokeWidth, frequency, wiggle, smoothen, widthVariance]);

  if (!ribbonPath) return null;

  return (
    <View
      testID="wobble-border"
      style={[StyleSheet.absoluteFill, { margin: -pad, pointerEvents: 'none' }]}
    >
      <Svg width={width + pad * 2} height={height + pad * 2}>
        {/* Inset by strokeWidth/2 so the ribbon straddles the box edge, then shifted by the pad. */}
        <G x={pad + strokeWidth / 2} y={pad + strokeWidth / 2}>
          <Path d={ribbonPath} fill={color} fillRule="evenodd" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * Measures its own box and renders a WobbleBorder to match. Use when the
 * size is determined by layout rather than known up front.
 */
export function useMeasuredSize() {
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const onLayout = React.useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    },
    [],
  );

  return { size, onLayout };
}
