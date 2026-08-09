import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { selectionFeedback } from '@/src/feedback';
import { colors } from '@/src/theme/tokens';
import { Text } from './Text';

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** capy-ui uses 303 for the count-direction toggle, 353 for the timeframe tabs. */
  width?: number;
}

const TRACK_HEIGHT = 36;
const TRACK_PADDING = 4;
const INDICATOR_HEIGHT = 28;

/**
 * Shared segmented control. The web original reads Base UI's
 * --active-tab-width/left CSS vars; here each tab reports its own layout
 * so the indicator can animate to it.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  width,
}: SegmentedTabsProps<T>) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const handleTabLayout = useCallback((tabValue: string, e: LayoutChangeEvent) => {
    const { x, width: w } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const prevLayout = prev[tabValue];
      if (prevLayout && prevLayout.x === x && prevLayout.width === w) return prev;
      return { ...prev, [tabValue]: { x, width: w } };
    });
  }, []);

  const active = layouts[value];

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const settled = useRef(false);

  useEffect(() => {
    if (!active) return;
    // Snap into place on first measure so it doesn't fly in from zero.
    const duration = settled.current ? 200 : 0;
    settled.current = true;
    indicatorX.value = withTiming(active.x, { duration });
    indicatorWidth.value = withTiming(active.width, { duration });
  }, [active, indicatorX, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={[styles.track, width != null && { width, maxWidth: '100%' }]}>
      <Animated.View style={[styles.indicator, indicatorStyle, !active && styles.hidden]} />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onLayout={(e) => handleTabLayout(option.value, e)}
            onPress={() => {
              // Re-tapping the active tab is a real gesture elsewhere (the
              // stats Custom tab reopens its picker), so this fires either way.
              selectionFeedback();
              onChange(option.value);
            }}
            style={styles.tab}
          >
            <Text
              variant="bodySemiBold"
              style={selected ? styles.tabLabelActive : styles.tabLabel}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    padding: TRACK_PADDING,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.buttonSecondary,
    alignItems: 'center',
    // Fill the container unless an explicit width is given; otherwise a
    // centering parent shrinks the track and crushes the labels together.
    alignSelf: 'stretch',
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    // No `left` inset: each tab's measured x is already relative to the
    // track's padded content box, so translateX carries the full offset.
    // Adding TRACK_PADDING on top of it shifted the pill a padding's width
    // right of its label and pushed the last tab over the track's edge.
    left: 0,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT / 2,
    backgroundColor: colors.white,
  },
  hidden: {
    opacity: 0,
  },
  tab: {
    flex: 1,
    height: INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.black,
  },
});
