/**
 * ? Capybara Timer - Time Picker Component
 * 
 * iOS-style scrollable time picker for focus and break durations.
 * Supports minimum 30 seconds for focus, 0 minutes for breaks.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TimePickerProps {
  initialMinutes: number;
  initialSeconds: number;
  onTimeChange: (minutes: number, seconds: number) => void;
  minimumSeconds?: number; // minimum total seconds allowed
  type: 'focus' | 'break';
}

export const TimePicker: React.FC<TimePickerProps> = ({
  initialMinutes,
  initialSeconds,
  onTimeChange,
  minimumSeconds = 0,
  type,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [selectedSeconds, setSelectedSeconds] = useState(initialSeconds);

  // Generate options for minutes and seconds
  const minuteOptions = Array.from({ length: 61 }, (_, i) => i); // 0-60 minutes
  const secondOptions = Array.from({ length: 60 }, (_, i) => i); // 0-59 seconds

  // Validate and update time
  const updateTime = (minutes: number, seconds: number) => {
    const totalSeconds = minutes * 60 + seconds;
    
    // Check minimum constraint
    if (totalSeconds < minimumSeconds) {
      // Set to minimum allowed time
      const minMinutes = Math.floor(minimumSeconds / 60);
      const minSeconds = minimumSeconds % 60;
      setSelectedMinutes(minMinutes);
      setSelectedSeconds(minSeconds);
      onTimeChange(minMinutes, minSeconds);
    } else {
      setSelectedMinutes(minutes);
      setSelectedSeconds(seconds);
      onTimeChange(minutes, seconds);
    }
  };

  // Handle minutes change
  const handleMinutesChange = (minutes: number) => {
    updateTime(minutes, selectedSeconds);
  };

  // Handle seconds change
  const handleSecondsChange = (seconds: number) => {
    updateTime(selectedMinutes, seconds);
  };

  // Format display text
  const formatTimeUnit = (value: number, unit: 'min' | 'sec'): string => {
    if (value === 0 && unit === 'min') return '0 min';
    if (value === 0 && unit === 'sec') return '0 sec';
    if (value === 1) return `1 ${unit.slice(0, -1)}`; // Remove 's' for singular
    return `${value} ${unit}`;
  };

  // Get total time in seconds for display
  const getTotalSeconds = () => selectedMinutes * 60 + selectedSeconds;
  const isMinimumTime = getTotalSeconds() <= minimumSeconds;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {type === 'focus' ? 'Focus Duration' : 'Break Duration'}
      </Text>
      
      {/* Current Selection Display */}
      <View style={styles.currentTimeDisplay}>
        <Text style={[styles.currentTime, { color: colors.primary }]}>
          {selectedMinutes > 0 && `${selectedMinutes}m `}
          {selectedSeconds > 0 && `${selectedSeconds}s`}
          {selectedMinutes === 0 && selectedSeconds === 0 && '0m'}
        </Text>
        {isMinimumTime && minimumSeconds > 0 && (
          <Text style={[styles.minimumWarning, { color: colors.warning }]}>
            Minimum: {Math.floor(minimumSeconds / 60)}m {minimumSeconds % 60}s
          </Text>
        )}
      </View>

      {/* Time Pickers Row */}
      <View style={styles.pickersRow}>
        {/* Minutes Picker */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.pickerLabel, { color: colors.text }]}>Minutes</Text>
          <View style={[styles.pickerContainer, { borderColor: colors.primary }]}>
            {/* Simplified picker - in a real app, you'd use a scroll picker library */}
            <View style={styles.pickerValues}>
              {[selectedMinutes - 1, selectedMinutes, selectedMinutes + 1]
                .filter(val => val >= 0 && val <= 60)
                .map((minute, index) => (
                <Text
                  key={minute}
                  style={[
                    styles.pickerValue,
                    { color: minute === selectedMinutes ? colors.primary : colors.text },
                    minute === selectedMinutes && styles.selectedValue,
                  ]}
                  onPress={() => handleMinutesChange(minute)}
                >
                  {formatTimeUnit(minute, 'min')}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Seconds Picker */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.pickerLabel, { color: colors.text }]}>Seconds</Text>
          <View style={[styles.pickerContainer, { borderColor: colors.primary }]}>
            <View style={styles.pickerValues}>
              {[selectedSeconds - 15, selectedSeconds, selectedSeconds + 15]
                .filter(val => val >= 0 && val < 60)
                .map((second, index) => (
                <Text
                  key={second}
                  style={[
                    styles.pickerValue,
                    { color: second === selectedSeconds ? colors.primary : colors.text },
                    second === selectedSeconds && styles.selectedValue,
                  ]}
                  onPress={() => handleSecondsChange(second)}
                >
                  {formatTimeUnit(second, 'sec')}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Quick Select Buttons for Common Times */}
      <View style={styles.quickSelectRow}>
        <Text style={[styles.quickSelectLabel, { color: colors.text }]}>Quick Select:</Text>
        <View style={styles.quickSelectButtons}>
          {type === 'focus' ? [
            { label: '5m', minutes: 5, seconds: 0 },
            { label: '15m', minutes: 15, seconds: 0 },
            { label: '25m', minutes: 25, seconds: 0 },
            { label: '45m', minutes: 45, seconds: 0 },
          ] : [
            { label: '0m', minutes: 0, seconds: 0 },
            { label: '5m', minutes: 5, seconds: 0 },
            { label: '10m', minutes: 10, seconds: 0 },
            { label: '15m', minutes: 15, seconds: 0 },
          ]}.map((option) => (
            <Text
              key={option.label}
              style={[
                styles.quickSelectButton,
                { 
                  backgroundColor: colors.primaryLight,
                  color: colors.primary,
                }
              ]}
              onPress={() => updateTime(option.minutes, option.seconds)}
            >
              {option.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: Layout.borderRadius.medium,
    marginVertical: Spacing.md,
  },
  
  title: {
    ...Typography.title3,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  
  currentTimeDisplay: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  
  currentTime: {
    ...Typography.timerDisplay,
    fontSize: 32,
  },
  
  minimumWarning: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
  
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  
  pickerLabel: {
    ...Typography.callout,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  
  pickerContainer: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.small,
    padding: Spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
    width: '80%',
  },
  
  pickerValues: {
    alignItems: 'center',
  },
  
  pickerValue: {
    ...Typography.body,
    paddingVertical: Spacing.sm,
    textAlign: 'center',
  },
  
  selectedValue: {
    fontWeight: '600',
    transform: [{ scale: 1.2 }],
  },
  
  quickSelectRow: {
    alignItems: 'center',
  },
  
  quickSelectLabel: {
    ...Typography.callout,
    marginBottom: Spacing.sm,
  },
  
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  
  quickSelectButton: {
    ...Typography.buttonSmall,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.small,
    textAlign: 'center',
    minWidth: 50,
  },
});
