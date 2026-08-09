import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { selectionFeedback } from '@/src/feedback';
import { colors } from '@/src/theme/tokens';

/** Category palette. Values are token names so a palette change re-themes existing tags. */
export const SWATCHES = [
  { value: 'green', color: colors.greenPrimary },
  { value: 'red', color: colors.redPrimary },
  { value: 'yellow', color: colors.yellowPrimary },
  { value: 'blue', color: colors.bluePrimary },
  { value: 'grey', color: colors.greyPrimary },
] as const;

export type SwatchValue = (typeof SWATCHES)[number]['value'];

export function swatchColor(value: string): string {
  return SWATCHES.find((s) => s.value === value)?.color ?? colors.greyPrimary;
}

export interface ColorPickerProps {
  value: SwatchValue;
  onChange: (value: SwatchValue) => void;
}

const SWATCH_SIZE = 20;
const RING_SIZE = 24;

/**
 * Swatches are 20pt rather than the 12pt in Figma: at 12 the invisible touch
 * target would overlap its neighbours.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {SWATCHES.map((swatch) => {
        const selected = swatch.value === value;
        return (
          <Pressable
            key={swatch.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={swatch.value}
            hitSlop={(44 - RING_SIZE) / 2}
            onPress={() => {
              selectionFeedback();
              onChange(swatch.value);
            }}
            style={[styles.ring, selected && styles.ringSelected]}
          >
            <View style={[styles.swatch, { backgroundColor: swatch.color }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // Reserve the ring's space always, so selecting doesn't nudge the row.
    borderColor: 'transparent',
  },
  ringSelected: {
    borderColor: colors.brown,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
});
