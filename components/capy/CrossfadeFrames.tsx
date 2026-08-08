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
 */
export function CrossfadeFrames({
  FrameA,
  FrameB,
  height,
  aspectRatio,
  cycleDuration = 1800,
}: CrossfadeFramesProps) {
  const width = height * aspectRatio;
  const mix = useSharedValue(0);

  useEffect(() => {
    mix.value = 0;
    mix.value = withRepeat(
      withSequence(
        withTiming(1, { duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [FrameA, FrameB, cycleDuration, mix]);

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
