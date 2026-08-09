import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BackIcon } from '@/components/capy/icons/BackIcon';
import { NextIcon } from '@/components/capy/icons/NextIcon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { selectionFeedback } from '@/src/feedback';
import type { Companion } from '@/src/store/types';

import { CapyMascot, skinForCompanionId } from './CapyMascot';

/** How far a drag must travel before releasing it counts as a swipe. */
const SWIPE_THRESHOLD = 48;
/** A flick past this speed changes buddy even if it didn't travel far. */
const FLICK_VELOCITY = 500;
/** How far the outgoing buddy slides before being replaced. */
const SLIDE_DISTANCE = 90;
const SLIDE_MS = 170;

export interface CompanionCarouselProps {
  companions: readonly Companion[];
  /** Index currently centred. */
  index: number;
  onIndexChange: (index: number) => void;
  size?: number;
  showName?: boolean;
}

/**
 * Swipe or arrow through the companions.
 *
 * This deliberately animates one buddy out and the next in rather than
 * scrolling a paged list. A paged list has to know its own pixel width, and
 * both ways of obtaining that are unreliable under react-native-web: onLayout
 * fires only intermittently and useWindowDimensions has been seen reporting
 * zero, which left the carousel rendering every companion stacked in a
 * one-pixel column. A transition needs no measurement, so it behaves the same
 * everywhere.
 */
export function CompanionCarousel({
  companions,
  index,
  onIndexChange,
  size = 190,
  showName = true,
}: CompanionCarouselProps) {
  const drag = useSharedValue(0);

  const atStart = index === 0;
  const atEnd = index === companions.length - 1;
  const current = companions[index];

  const go = (next: number) => {
    if (next < 0 || next >= companions.length) return;
    selectionFeedback();
    onIndexChange(next);
  };

  // One orchestrated sequence per transition — slide the outgoing buddy off,
  // then (once that finishes) swap the index and jump the offset to the far
  // edge so the new buddy immediately animates in from there. This used to
  // be split across this function and a separate `useEffect([index, drag])`
  // that slid the incoming buddy toward 0, but `go` below changing `index`
  // triggers a re-render on essentially the same tick, so that effect fired
  // almost immediately and overwrote the still-mid-flight outgoing animation
  // — the "slide out, jump, slide in" never actually played, and the
  // outgoing animation's own completion callback (also jumping `drag`) could
  // still land afterward and yank the new buddy sideways. Doing the whole
  // thing as one chain removes the race outright.
  const commit = (direction: 1 | -1) => {
    const next = index + direction;
    if (next < 0 || next >= companions.length) {
      // Nothing there — spring back so the edge is felt rather than silent.
      drag.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.quad) });
      return;
    }
    drag.value = withTiming(
      -direction * SLIDE_DISTANCE,
      { duration: SLIDE_MS, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (!finished) return; // interrupted by another swipe; let that one own the sequence
        drag.value = direction * SLIDE_DISTANCE;
        runOnJS(go)(next);
        drag.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.quad) });
      },
    );
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      // Resist at the ends so the list's edges are palpable.
      const resistance =
        (e.translationX > 0 && atStart) || (e.translationX < 0 && atEnd) ? 0.25 : 1;
      drag.value = e.translationX * resistance;
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      const fast = Math.abs(e.velocityX) > FLICK_VELOCITY;

      if (far || fast) {
        runOnJS(commit)(e.translationX > 0 ? -1 : 1);
        return;
      }
      drag.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.quad) });
    });

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value }],
    opacity: Math.max(0, 1 - Math.abs(drag.value) / (SLIDE_DISTANCE * 1.6)),
  }));

  return (
    <View style={styles.row}>
      <IconButton
        icon={BackIcon}
        size={20}
        accessibilityLabel="Previous buddy"
        disabled={atStart}
        feedback="none"
        onPress={() => commit(-1)}
      />

      <GestureDetector gesture={pan}>
        <View style={styles.viewport} accessibilityLabel="Companion">
          <Animated.View style={[styles.slide, slideStyle]}>
            {current && (
              <>
                <CapyMascot
                  size={size}
                  skin={skinForCompanionId(current.id)}
                  locked={!current.unlocked}
                />
                {showName && (
                  <Text variant="h1" style={styles.name}>
                    {current.name}
                  </Text>
                )}
              </>
            )}
          </Animated.View>
        </View>
      </GestureDetector>

      <IconButton
        icon={NextIcon}
        size={20}
        accessibilityLabel="Next buddy"
        disabled={atEnd}
        feedback="none"
        onPress={() => commit(1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  name: {
    fontSize: 20,
  },
});
