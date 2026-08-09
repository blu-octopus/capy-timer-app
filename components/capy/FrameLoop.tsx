import React, { useLayoutEffect } from 'react';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

export interface FrameLoopProps {
  FrameA: ComponentType<SvgProps>;
  FrameB: ComponentType<SvgProps>;
  /** Rendered height; width is derived from aspectRatio (frame width / frame height). */
  height: number;
  aspectRatio: number;
  /** Full A→B→A loop duration in ms. */
  cycleDuration?: number;
}

/**
 * Loops a state's two hand-drawn frames as a flipbook: each frame is held,
 * then swapped for the other on a hard cut, the way 2-frame sticker art is
 * meant to read.
 *
 * It deliberately does *not* crossfade. Blending the pair means that at the
 * midpoint both drawings sit at 50% opacity over the background at once —
 * the linework doubles up and the whole capybara visibly washes out, then
 * sharpens again as the blend resolves. Cycled continuously, that pulse
 * reads as a flash, which is exactly what it was mistaken for. Opacity here
 * is therefore a step function evaluated on the UI thread (never an
 * intermediate value), so the two frames can never be on screen together.
 * Both stay mounted — only their visibility flips — so a swap costs no
 * re-render and no remount of the (very large) SVG trees.
 *
 * Continuous, non-flashing motion belongs on top of this rather than inside
 * it: the generated frames expose their Figma layers as animatable `parts`
 * (see components/capy/frames/README.md), so a bob or a stretch is a
 * transform on a named group, not a blend between whole drawings.
 */
export function FrameLoop({
  FrameA,
  FrameB,
  height,
  aspectRatio,
  cycleDuration = 1800,
}: FrameLoopProps) {
  const width = height * aspectRatio;
  // Sweeps 0→1 linearly and restarts; the styles below read it as a step, so
  // the easing curve never shows up as a partial fade.
  const phase = useSharedValue(0);

  useLayoutEffect(() => {
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: cycleDuration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [FrameA, FrameB, cycleDuration, phase]);

  const styleA = useAnimatedStyle(() => ({ opacity: phase.value < 0.5 ? 1 : 0 }));
  const styleB = useAnimatedStyle(() => ({ opacity: phase.value < 0.5 ? 0 : 1 }));

  return (
    <View style={{ width, height }}>
      <Animated.View style={[StyleSheet.absoluteFill, styleA]}>
        <FrameA width={width} height={height} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styleB]}>
        <FrameB width={width} height={height} />
      </Animated.View>
    </View>
  );
}
