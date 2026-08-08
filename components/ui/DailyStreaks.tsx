import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme/tokens';
import { Checkbox } from './Checkbox';
import { Text } from './Text';

export interface DailyStreaksRow {
  label: string;
  checked: boolean[];
}

export interface DailyStreaksProps {
  heading?: string;
  days?: string[];
  rows: DailyStreaksRow[];
  onToggle?: (rowIndex: number, dayIndex: number, checked: boolean) => void;
}

const CELL_WIDTH = 24;

/** Stateless — the parent owns `rows` and mirrors `onToggle` back in. */
export function DailyStreaks({
  heading = 'Streaks',
  days = ['M', 'T', 'W', 'T', 'F'],
  rows,
  onToggle,
}: DailyStreaksProps) {
  return (
    <View style={styles.root}>
      <Text variant="h2">{heading}</Text>

      <View style={styles.headerRow}>
        <View style={styles.labelColumn} />
        {days.map((day, index) => (
          <View key={index} style={styles.cell}>
            <Text variant="caption">{day}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.labelColumn}>
            <Text variant="body">{row.label}</Text>
          </View>
          {days.map((_, dayIndex) => (
            <View key={dayIndex} style={styles.cell}>
              <Checkbox
                checked={row.checked[dayIndex] ?? false}
                accessibilityLabel={`${row.label}, day ${dayIndex + 1}`}
                onChange={(next) => onToggle?.(rowIndex, dayIndex, next)}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelColumn: {
    flex: 1,
  },
  cell: {
    width: CELL_WIDTH,
    minHeight: CELL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    // Clips the checkbox's oversized touch target so neighbours stay tappable.
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
  },
});
