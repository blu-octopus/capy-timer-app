import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { selectionFeedback } from '@/src/feedback';
import { colors, fonts } from '@/src/theme/tokens';

/**
 * A curved wheel of options you flick through, ported from the React Bits
 * "OptionWheel" web component.
 *
 * The arc math is the original's: options ride a circle whose radius makes the
 * arc between neighbours exactly one row tall, so `tilt` alone controls how
 * tightly the list curls. Everything that touched the DOM had to be
 * re-expressed — pointer capture became a pan gesture, the rAF easing loop
 * became a shared value, and `color-mix` became interpolateColor — following
 * the same hand-port convention this app uses for every capy-ui component.
 *
 * One deliberate omission: the original blurs options by their distance from
 * the centre, which React Native cannot do (there is no per-view filter, and
 * expo-blur blurs a backdrop region rather than an element). Opacity falloff
 * and a slight scale taper carry that depth cue instead.
 */
export interface OptionWheelOption<T> {
  value: T;
  label: string;
}

export interface OptionWheelProps<T> {
  options: readonly OptionWheelOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Label height basis in px; row spacing is a multiple of it. */
  fontSize?: number;
  /** Row height as a multiple of fontSize. */
  spacing?: number;
  /** Degrees between neighbouring options; higher curls the wheel tighter. */
  tilt?: number;
  /** How far options swing sideways along the curve; 0 flattens it to a list. */
  curve?: number;
  /** Opacity lost per step away from the centre. */
  fade?: number;
  minOpacity?: number;
  /** How many rows fit in the visible window. Should be odd so one sits centred. */
  visibleCount?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULTS = {
  fontSize: 22,
  spacing: 1.7,
  tilt: 9,
  curve: 1,
  fade: 0.32,
  minOpacity: 0.12,
  visibleCount: 5,
};

/** Matches the original's settling feel without its per-frame easing loop. */
const SETTLE_MS = 260;

/**
 * Decides where a release lands and whether that's new information.
 *
 * `shouldCommit` is false when the release target is the index the live drag
 * already reported (the common case — most releases just settle where the
 * finger already was). It's true only when momentum carries the wheel past
 * an index the drag never reached, which is the one case that still needs a
 * report. Exported (and marked `worklet` rather than relying on call-site
 * auto-workletization) so it's callable directly from a test, unlike the rest
 * of this file's Reanimated-only logic.
 */
export function resolveFlickTarget(
  positionAtRelease: number,
  velocityY: number,
  rowHeight: number,
  optionCount: number,
): { target: number; shouldCommit: boolean } {
  'worklet';
  const from = Math.round(positionAtRelease);
  const momentum = -velocityY / rowHeight / 6;
  const target = Math.round(
    Math.min(optionCount - 1, Math.max(0, positionAtRelease + momentum)),
  );
  return { target, shouldCommit: target !== from };
}

function OptionRow({
  label,
  index,
  position,
  rowHeight,
  radius,
  tiltRad,
  curve,
  fade,
  minOpacity,
  fontSize,
}: {
  label: string;
  index: number;
  position: SharedValue<number>;
  rowHeight: number;
  radius: number;
  tiltRad: number;
  curve: number;
  fade: number;
  minOpacity: number;
  fontSize: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const d = index - position.value;
    const distance = Math.abs(d);

    // Clamped so an option can never swing past the back of the circle.
    const angle = Math.min(Math.PI / 2, Math.max(-Math.PI / 2, d * tiltRad));
    const y = radius > 0 ? radius * Math.sin(angle) : d * rowHeight;
    const x = radius > 0 ? -radius * (1 - Math.cos(angle)) * curve : 0;
    const rotate = radius > 0 ? (angle * 180) / Math.PI : 0;

    return {
      opacity: Math.max(minOpacity, 1 - distance * fade),
      transform: [
        { translateY: y },
        { translateX: x },
        { rotateZ: `${rotate}deg` },
        // Stands in for the web original's progressive blur.
        { scale: Math.max(0.72, 1 - distance * 0.12) },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const nearness = Math.max(0, 1 - Math.min(Math.abs(index - position.value), 1));
    return {
      color: interpolateColor(nearness, [0, 1], [colors.grey, colors.brown]),
    };
  });

  return (
    <Animated.View style={[styles.row, { height: rowHeight }, animatedStyle]} pointerEvents="none">
      <Animated.Text
        style={[
          styles.label,
          { fontSize, lineHeight: Math.round(fontSize * 1.2) },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

export function OptionWheel<T extends string | number>({
  options,
  value,
  onChange,
  fontSize = DEFAULTS.fontSize,
  spacing = DEFAULTS.spacing,
  tilt = DEFAULTS.tilt,
  curve = DEFAULTS.curve,
  fade = DEFAULTS.fade,
  minOpacity = DEFAULTS.minOpacity,
  visibleCount = DEFAULTS.visibleCount,
  accessibilityLabel,
  style,
}: OptionWheelProps<T>) {
  const rowHeight = Math.max(1, fontSize * spacing);
  const tiltRad = (tilt * Math.PI) / 180;
  // Radius that makes the arc between two neighbours exactly one row tall.
  const radius = tiltRad > 0.0005 ? rowHeight / tiltRad : 0;
  const height = rowHeight * visibleCount;

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const position = useSharedValue(selectedIndex);
  const panStart = useSharedValue(0);
  /**
   * True while position.value is gliding toward an index that's already been
   * reported (a momentum settle, or following an external value change) —
   * every index the glide sweeps through on the way is old news, not a new
   * selection, so the reaction below stays quiet until it clears.
   */
  const isAnimating = useSharedValue(false);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (option && option.value !== value) onChange(option.value);
    },
    [options, value, onChange],
  );

  // Follow external changes (a reset, or another control writing the plan),
  // but never fight the user mid-gesture. Nothing needs telling here: the
  // caller that changed `value` already knows what it set it to.
  useEffect(() => {
    if (Math.round(position.value) === selectedIndex) return;
    cancelAnimation(position);
    isAnimating.value = true;
    position.value = withTiming(
      selectedIndex,
      { duration: SETTLE_MS, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) isAnimating.value = false;
      },
    );
  }, [selectedIndex, position, isAnimating]);

  // Fires the detent tick and reports upward as the wheel passes each option
  // during a live drag — that continuous ticking is most of what makes the
  // wheel feel physical. Suppressed during an animated glide (see
  // isAnimating) so a big flick reports its landing index once, not every
  // index it happens to sweep past on the way there.
  useAnimatedReaction(
    () => Math.round(position.value),
    (current, previous) => {
      if (isAnimating.value) return;
      if (previous === null || current === previous) return;
      if (current < 0 || current >= options.length) return;
      runOnJS(selectionFeedback)();
      runOnJS(commit)(current);
    },
    [options.length, commit],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Vertical intent only, so a wheel inside a scrolling sheet doesn't
        // steal the sheet's own drag. The 4px threshold matches the web
        // original's, where a smaller move stayed a click rather than a drag.
        .activeOffsetY([-4, 4])
        .failOffsetX([-12, 12])
        .onStart(() => {
          cancelAnimation(position);
          // A cancelled withTiming calls its callback with finished=false,
          // which would otherwise leave isAnimating stuck true forever if the
          // user grabs the wheel again mid-settle.
          isAnimating.value = false;
          panStart.value = position.value;
        })
        .onUpdate((e) => {
          const next = panStart.value - e.translationY / rowHeight;
          // Rubber-banding past the ends signals the limit without a hard stop.
          const clamped = Math.min(options.length - 1 + 0.35, Math.max(-0.35, next));
          position.value = clamped;
        })
        .onEnd((e) => {
          const { target, shouldCommit } = resolveFlickTarget(
            position.value,
            e.velocityY,
            rowHeight,
            options.length,
          );

          isAnimating.value = true;
          // The live drag already reported the index it was sitting on;
          // report the new one now, immediately, rather than letting the
          // glide's per-frame position sweep past everything in between.
          if (shouldCommit) {
            runOnJS(selectionFeedback)();
            runOnJS(commit)(target);
          }
          position.value = withTiming(
            target,
            { duration: SETTLE_MS, easing: Easing.out(Easing.quad) },
            (finished) => {
              if (finished) isAnimating.value = false;
            },
          );
        }),
    [options.length, rowHeight, position, panStart, isAnimating, commit],
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: options[selectedIndex]?.label }}
        style={[styles.viewport, { height }, style]}
      >
        {/* Centres row 0 in the viewport; every other row offsets from it. */}
        <View style={[styles.track, { top: height / 2 - rowHeight / 2 }]}>
          {options.map((option, index) => (
            <OptionRow
              key={String(option.value)}
              label={option.label}
              index={index}
              position={position}
              rowHeight={rowHeight}
              radius={radius}
              tiltRad={tiltRad}
              curve={curve}
              fade={fade}
              minOpacity={minOpacity}
              fontSize={fontSize}
            />
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  viewport: {
    // Every row is absolutely positioned, so the viewport has no intrinsic
    // width and would collapse to zero inside a centring parent — taking the
    // whole wheel with it, since overflow is hidden.
    alignSelf: 'stretch',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.display,
    textAlign: 'center',
  },
});
