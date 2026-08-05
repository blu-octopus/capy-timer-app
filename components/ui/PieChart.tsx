import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, seeds } from '@/src/theme/tokens';
import { Text } from './Text';
import { useMeasuredSize, WobbleBorder } from './WobbleBorder';

export interface PieChartDatum {
  label: string;
  /** Raw magnitude; normalised internally. */
  value: number;
  color: string;
}

export interface PieChartProps {
  title?: string;
  data: PieChartDatum[];
  size?: number;
}

/** Wedge starting at 12 o'clock, sweeping clockwise. */
function wedgePath(center: number, radius: number, startPct: number, endPct: number): string {
  const toAngle = (pct: number) => (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const a1 = toAngle(startPct);
  const a2 = toAngle(endPct);

  const x1 = center + radius * Math.cos(a1);
  const y1 = center + radius * Math.sin(a1);
  const x2 = center + radius * Math.cos(a2);
  const y2 = center + radius * Math.sin(a2);
  const largeArc = endPct - startPct > 50 ? 1 : 0;

  return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function PieChart({ title = 'Categories', data, size = 120 }: PieChartProps) {
  const { size: cardSize, onLayout } = useMeasuredSize();

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const center = size / 2;

  let cursor = 0;
  const wedges = data.map((datum) => {
    const percent = total > 0 ? (datum.value / total) * 100 : 0;
    const wedge = { datum, start: cursor, end: cursor + percent, percent };
    cursor += percent;
    return wedge;
  });

  return (
    <View style={styles.card} onLayout={onLayout}>
      <WobbleBorder
        width={cardSize.width}
        height={cardSize.height}
        radius={10}
        seed={seeds.pieChart}
      />

      <Text variant="body" style={styles.title}>
        {title}
      </Text>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="caption">No focus time logged yet</Text>
        </View>
      ) : (
      <View style={styles.body}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {wedges.map((wedge, index) => (
            <Path
              key={index}
              d={wedgePath(center, center, wedge.start, wedge.end)}
              fill={wedge.datum.color}
              // Thin white gaps: the palette alone fails colourblind contrast
              // when used categorically, so the wedges are separated too.
              stroke={colors.white}
              strokeWidth={2}
            />
          ))}
        </Svg>

        <View style={styles.legend}>
          {wedges.map((wedge, index) => (
            <View key={index} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: wedge.datum.color }]} />
              <Text variant="body" style={styles.legendLabel}>
                {wedge.datum.label}
              </Text>
              <Text variant="bodySemiBold">{Math.round(wedge.percent)}%</Text>
            </View>
          ))}
        </View>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 325,
    padding: 16,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  title: {
    marginBottom: 18,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    color: colors.grey,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
