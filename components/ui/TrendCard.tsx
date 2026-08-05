import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, seeds } from '@/src/theme/tokens';
import { Text } from './Text';
import { useMeasuredSize, WobbleBorder } from './WobbleBorder';

export interface TrendCardStat {
  value: React.ReactNode;
  unit?: string;
}

export interface TrendCardProps {
  title: string;
  /** One large number, or two side by side (e.g. 12 hr 40 min). */
  stats: [TrendCardStat] | [TrendCardStat, TrendCardStat];
  /** Pinned top-right; built for a ProgressRing. */
  indicator?: React.ReactNode;
}

export function TrendCard({ title, stats, indicator }: TrendCardProps) {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.card} onLayout={onLayout}>
      <WobbleBorder
        width={size.width}
        height={size.height}
        radius={10}
        seed={seeds.trendCard}
      />

      <Text variant="body">{title}</Text>
      {indicator && <View style={styles.indicator}>{indicator}</View>}

      <View style={styles.stats}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.stat}>
            <Text variant="stat">{stat.value}</Text>
            {stat.unit && (
              <Text variant="caption" style={styles.unit}>
                {stat.unit}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 152,
    height: 84,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  indicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  stats: {
    // Pins the numbers to the bottom of the card.
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  unit: {
    marginLeft: 2,
  },
});
