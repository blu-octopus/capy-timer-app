import React, { useLayoutEffect } from 'react';
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
 * The reset to `mix.value = 0` runs in a *layout* effect rather than a
 * regular one, so it lands before the browser/native paint of the frame that
 * introduced new FrameA/FrameB props — a plain `useEffect` fires after that
 * paint, which let the incoming art render for one frame at whatever
 * half-crossfaded opacity the previous mood's loop happened to be at.
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

  useLayoutEffect(() => {
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
