/**
 * ?? Time Slider Component
 * 
 * A smooth slider for selecting time durations with visual feedback.
 * Shows time in minutes and seconds with customizable ranges.
 */

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeSliderProps {
  label: string;
  value: number; // in seconds
  onValueChange: (value: number) => void;
  min: number; // in seconds
  max: number; // in seconds
  step: number; // in seconds
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0 && minutes > 0) {
      return `${minutes}m`;
    }
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <View style={styles.container}>
      {/* Label and Value */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.value, { color: colors.accent }]}>
          {formatTime(value)}
        </Text>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          value={value}
          onValueChange={onValueChange}
          minimumValue={min}
          maximumValue={max}
          step={step}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.text + '30'}
          thumbTintColor={colors.accent}
        />
        
        {/* Min/Max Labels */}
        <View style={styles.rangeLabels}>
          <Text style={[styles.rangeLabel, { color: colors.text }]}>
            {formatTime(min)}
          </Text>
          <Text style={[styles.rangeLabel, { color: colors.text }]}>
            {formatTime(max)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  label: {
    ...Typography.callout,
    fontWeight: '600',
  },

  value: {
    ...Typography.title3,
    fontWeight: '700',
  },

  sliderContainer: {
    paddingHorizontal: Spacing.xs,
  },

  slider: {
    width: '100%',
    height: 40,
  },

  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs2,
  },

  rangeLabel: {
    ...Typography.caption1,
    opacity: 0.6,
  },
});
