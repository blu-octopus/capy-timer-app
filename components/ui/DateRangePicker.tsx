import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackIcon } from '@/components/capy/icons/BackIcon';
import { NextIcon } from '@/components/capy/icons/NextIcon';
import type { DateRange } from '@/src/db/stats';
import { selectionFeedback } from '@/src/feedback';
import { formatMonthTitle, monthGrid, normalizeDayRange } from '@/src/utils/calendar';
import { colors } from '@/src/theme/tokens';
import { IconButton } from './IconButton';
import { Modal } from './Modal';
import { Text } from './Text';

export interface DateRangePickerProps {
  visible: boolean;
  /** Range the picker opens on; its start month is shown first. */
  initialRange: DateRange;
  onDismiss: () => void;
  onConfirm: (range: DateRange) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 36;

/**
 * Minimal month-calendar range picker: first tap sets the start day, second
 * sets the end (either order), a third starts over. Confirming a single tap
 * selects just that day.
 */
export function DateRangePicker({
  visible,
  initialRange,
  onDismiss,
  onConfirm,
}: DateRangePickerProps) {
  const initial = new Date(initialRange.start);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [firstTap, setFirstTap] = useState<number | null>(null);
  const [secondTap, setSecondTap] = useState<number | null>(null);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const onTapDay = (ts: number) => {
    if (firstTap === null || secondTap !== null) {
      setFirstTap(ts);
      setSecondTap(null);
    } else {
      setSecondTap(ts);
    }
  };

  const onDone = () => {
    if (firstTap === null) return;
    onConfirm(normalizeDayRange(firstTap, secondTap ?? firstTap));
    setFirstTap(null);
    setSecondTap(null);
  };

  const selStart = firstTap === null ? null : Math.min(firstTap, secondTap ?? firstTap);
  const selEnd = firstTap === null ? null : Math.max(firstTap, secondTap ?? firstTap);

  return (
    <Modal
      visible={visible}
      title="Pick a date range"
      onDismiss={onDismiss}
      onDone={onDone}
      doneDisabled={firstTap === null}
    >
      <View style={styles.monthHeader}>
        <IconButton
          icon={BackIcon}
          size={18}
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
        />
        <Text variant="body">{formatMonthTitle(viewYear, viewMonth)}</Text>
        <IconButton
          icon={NextIcon}
          size={18}
          accessibilityLabel="Next month"
          onPress={() => shiftMonth(1)}
        />
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <View key={index} style={styles.cell}>
            <Text variant="caption">{day}</Text>
          </View>
        ))}
      </View>

      {monthGrid(viewYear, viewMonth).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day) => {
            const selected =
              selStart !== null && selEnd !== null && day.ts >= selStart && day.ts <= selEnd;
            const isEdge = day.ts === selStart || day.ts === selEnd;
            return (
              <Pressable
                key={day.ts}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={new Date(day.ts).toDateString()}
                onPress={() => {
                  selectionFeedback();
                  onTapDay(day.ts);
                }}
                style={[
                  styles.cell,
                  selected && styles.cellInRange,
                  isEdge && styles.cellEdge,
                ]}
              >
                <Text variant="caption" style={!day.inMonth ? styles.outsideMonth : undefined}>
                  {day.dayOfMonth}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Text variant="caption" style={styles.hint}>
        tap a start day, then an end day
      </Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL / 2,
  },
  cellInRange: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 0,
  },
  cellEdge: {
    borderRadius: CELL / 2,
    borderWidth: 1,
    borderColor: colors.brown,
    backgroundColor: colors.buttonPrimary,
  },
  outsideMonth: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  hint: {
    textAlign: 'center',
  },
});
