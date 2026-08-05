import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';

import { niceMax, niceTicks } from '@/src/theme/chartTicks';
import { colors, fonts, seeds } from '@/src/theme/tokens';
import { Text } from './Text';
import { useMeasuredSize, WobbleBorder } from './WobbleBorder';

export interface BarChartDatum {
  value: number;
  label?: string;
}

export interface BarChartProps {
  title?: string;
  data: BarChartDatum[];
  /** Axis ceiling; defaults to a rounded-up nice value. */
  max?: number;
  unit?: string;
  barColor?: string;
}

// Fixed viewBox geometry, scaled to the card by the SVG itself.
const PLOT_WIDTH = 250;
const PLOT_HEIGHT = 90;
const LEFT_MARGIN = 42;
const TOP_MARGIN = 8;
const BOTTOM_MARGIN = 20;
const BAR_GAP = 6;
const BAR_RADIUS = 4;
const TICK_COUNT = 3;

const VIEW_WIDTH = LEFT_MARGIN + PLOT_WIDTH;
const VIEW_HEIGHT = TOP_MARGIN + PLOT_HEIGHT + BOTTOM_MARGIN;

/** Bar with rounded top corners and a square base sitting on the axis. */
function barPath(x: number, width: number, top: number, bottom: number): string {
  const r = Math.min(BAR_RADIUS, width / 2, Math.max(bottom - top, 0));
  if (r <= 0) return `M ${x} ${top} H ${x + width} V ${bottom} H ${x} Z`;

  return [
    `M ${x} ${top + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${top}`,
    `H ${x + width - r}`,
    `A ${r} ${r} 0 0 1 ${x + width} ${top + r}`,
    `V ${bottom}`,
    `H ${x}`,
    'Z',
  ].join(' ');
}

export function BarChart({
  title = 'Average Session Length',
  data,
  max,
  unit = 'min',
  barColor = colors.greenPrimary,
}: BarChartProps) {
  const { size, onLayout } = useMeasuredSize();

  const dataMax = data.reduce((m, d) => Math.max(m, d.value), 0);
  const axisMax = max ?? niceMax(dataMax, TICK_COUNT);
  const ticks = niceTicks(axisMax, TICK_COUNT);

  const barWidth =
    data.length > 0 ? (PLOT_WIDTH - BAR_GAP * (data.length - 1)) / data.length : 0;

  return (
    <View style={styles.card} onLayout={onLayout}>
      <WobbleBorder width={size.width} height={size.height} radius={10} seed={seeds.barChart} />

      <Text variant="body" style={styles.title}>
        {title}
      </Text>

      {data.length === 0 && (
        <View style={styles.empty}>
          <Text variant="caption">No sessions yet</Text>
        </View>
      )}

      <Svg width="100%" height={VIEW_HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
        <G y={TOP_MARGIN}>
          {/* Tick labels only — the design has no gridlines. */}
          {ticks.map((tick) => {
            const y = PLOT_HEIGHT - (tick / axisMax) * PLOT_HEIGHT;
            return (
              <SvgText
                key={tick}
                x={LEFT_MARGIN - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fontFamily={fonts.body}
                fill={colors.grey}
              >
                {`${tick} ${unit}`}
              </SvgText>
            );
          })}

          {data.map((datum, index) => {
            const height = axisMax > 0 ? (datum.value / axisMax) * PLOT_HEIGHT : 0;
            const x = LEFT_MARGIN + index * (barWidth + BAR_GAP);
            return (
              <Path
                key={index}
                d={barPath(x, barWidth, PLOT_HEIGHT - height, PLOT_HEIGHT)}
                fill={barColor}
              />
            );
          })}

          {/* Drawn after the bars so a full-height bar never covers an axis. */}
          <Line
            x1={LEFT_MARGIN}
            y1={0}
            x2={LEFT_MARGIN}
            y2={PLOT_HEIGHT}
            stroke={colors.black}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={LEFT_MARGIN}
            y1={PLOT_HEIGHT}
            x2={LEFT_MARGIN + PLOT_WIDTH}
            y2={PLOT_HEIGHT}
            stroke={colors.black}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {data.map((datum, index) =>
            datum.label ? (
              <SvgText
                key={`label-${index}`}
                x={LEFT_MARGIN + index * (barWidth + BAR_GAP) + barWidth / 2}
                y={PLOT_HEIGHT + 16}
                textAnchor="middle"
                fontSize={10}
                fontFamily={fonts.body}
                fill={colors.grey}
              >
                {datum.label}
              </SvgText>
            ) : null,
          )}
        </G>
      </Svg>
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
    marginBottom: 22,
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});
