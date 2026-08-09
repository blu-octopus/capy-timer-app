import React, { useEffect } from 'react';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

export interface CrossfadeFramesProps {
  FrameA: ComponentType<SvgProps>;
  FrameB: ComponentType<SvgProps>;
  /** Rendered height; width is derived from aspectRatio (frame width / frame height). */
  height: number;
  aspectRatio: number;
  /** Full A→B→A loop duration in ms. */
  cycleDuration?: number;
}

/**
 * Loops a soft opacity crossfade between a state's two hand-drawn frames —
 * the "smart animation" between the 2-frame idle/mad/dance art pairs, in
 * place of redrawing or morphing path geometry.
 *
 * The caller (CapyMascot) keys this component by mood/skin so that changing
 * either always mounts a fresh instance rather than reusing this one with
 * new FrameA/FrameB props. That matters because `useEffect` runs *after* the
 * first paint of new props — reusing the instance meant the very first frame
 * of new art could render with mix still holding its old, unrelated value
 * from whatever point the previous mood's loop happened to be at, i.e. a
 * flash of the new frames overlaid at a stale, half-crossfaded opacity for
 * one paint before the effect below caught up and reset it.
 */
export function CrossfadeFrames({
  FrameA,
  FrameB,
  height,
  aspectRatio,
  cycleDuration = 1800,
}: CrossfadeFramesProps) {
  const width = height * aspectRatio;
  // Starts at 0 on every mount (a fresh instance per the key above), so the
  // first paint is already correct — no separate reset needed here.
  const mix = useSharedValue(0);

  useEffect(() => {
    mix.value = withRepeat(
      withSequence(
        withTiming(1, { duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [cycleDuration, mix]);

  const styleA = useAnimatedStyle(() => ({ opacity: 1 - mix.value }));
  const styleB = useAnimatedStyle(() => ({ opacity: mix.value }));

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
