import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatClock } from '@/src/theme/formatClock';
import { colors, fonts } from '@/src/theme/tokens';

export type TimerClockVariant = 'main' | 'secondary';
export type CountDirection = 'up' | 'down';

export interface TimerClockProps {
  seconds: number;
  variant?: TimerClockVariant;
  /** Which way digits slide; purely cosmetic. */
  direction?: CountDirection;
  animated?: boolean;
}

const VARIANTS: Record<TimerClockVariant, { fontSize: number; fontFamily: string }> = {
  main: { fontSize: 48, fontFamily: fonts.display },
  secondary: { fontSize: 20, fontFamily: fonts.displayLight },
};

const SLIDE_MS = 340;
// Matches capy-ui's odometer easing.
const SLIDE_EASING = Easing.bezier(0.22, 0.61, 0.36, 1);
// Glyph box a little taller than the point size so descenders aren't clipped.
const LINE_HEIGHT_RATIO = 1.2;

/**
 * Presentational only — it renders whatever second count it is handed. The
 * store owns elapsed time, so there is no second clock here to drift out of
 * step with the real one.
 */
export function TimerClock({
  seconds,
  variant = 'main',
  direction = 'down',
  animated = true,
}: TimerClockProps) {
  const { fontSize, fontFamily } = VARIANTS[variant];
  const height = Math.round(fontSize * LINE_HEIGHT_RATIO);
  const display = formatClock(seconds);

  const textStyle: TextStyle = {
    fontFamily,
    fontSize,
    height,
    lineHeight: height,
    color: colors.brown,
    textAlign: 'center',
  };

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={display}
      style={[styles.row, { height }]}
    >
      {display.split('').map((char, index) => (
        <Character
          // Position-keyed: the digit in slot 2 is the same odometer wheel
          // frame to frame, only its value changes.
          key={index}
          char={char}
          height={height}
          textStyle={textStyle}
          direction={direction}
          animated={animated}
        />
      ))}
    </View>
  );
}

interface CharacterProps {
  char: string;
  height: number;
  textStyle: TextStyle;
  direction: CountDirection;
  animated: boolean;
}

function Character({ char, height, textStyle, direction, animated }: CharacterProps) {
  const [pair, setPair] = useState({ prev: char, next: char });
  // Forces a fresh track mount per transition so the slide replays.
  const sequence = useRef(0);

  useEffect(() => {
    setPair((current) => {
      if (current.next === char) return current;
      sequence.current += 1;
      return { prev: current.next, next: char };
    });
  }, [char]);

  const isColon = char === ':';
  const changed = pair.prev !== pair.next;

  if (isColon || !animated || !changed) {
    return (
      <View style={[styles.cell, { height }]}>
        <Text style={textStyle}>{char}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.cell, { height }]}>
      <DigitTrack
        key={`${pair.prev}-${pair.next}-${sequence.current}`}
        prev={pair.prev}
        next={pair.next}
        height={height}
        textStyle={textStyle}
        direction={direction}
      />
    </View>
  );
}

interface DigitTrackProps {
  prev: string;
  next: string;
  height: number;
  textStyle: TextStyle;
  direction: CountDirection;
}

/**
 * Two stacked glyph cells that slide by exactly one cell height. Counting
 * down brings the new digit in from above; counting up pushes it up from
 * below.
 */
function DigitTrack({ prev, next, height, textStyle, direction }: DigitTrackProps) {
  const countingDown = direction === 'down';
  const from = countingDown ? -height : 0;
  const to = countingDown ? 0 : -height;

  const offset = useSharedValue(from);

  useEffect(() => {
    offset.value = withTiming(to, { duration: SLIDE_MS, easing: SLIDE_EASING });
  }, [offset, to]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  const top = countingDown ? next : prev;
  const bottom = countingDown ? prev : next;

  return (
    // The track is twice the cell height; without an explicit size flex
    // shrinks it to fit and both glyphs get squashed out of alignment.
    <Animated.View style={[{ height: height * 2, flexShrink: 0 }, animatedStyle]}>
      <Text style={textStyle}>{top}</Text>
      <Text style={textStyle}>{bottom}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
});
