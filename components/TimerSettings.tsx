/**
 * ?? Timer Settings Component
 * 
 * Comprehensive timer configuration interface including:
 * - Focus/Break duration selection
 * - Number of loops
 * - Optional prep phase toggle
 * - Count up/down preference
 */

import { Colors } from '@/constants/Colors';
import { Layout, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TimerSettings as TimerSettingsType } from '@/hooks/useTimer';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TimeSlider } from './TimeSlider';
import { ToggleSwitch } from './ToggleSwitch';

interface TimerSettingsProps {
  settings: TimerSettingsType;
  onSettingsChange: (newSettings: TimerSettingsType) => void;
  style?: any;
}

export const TimerSettings: React.FC<TimerSettingsProps> = ({
  settings,
  onSettingsChange,
  style,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Helper function to update settings
  const updateSetting = <K extends keyof TimerSettingsType>(
    key: K,
    value: TimerSettingsType[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // Calculate total session time for display
  const calculateTotalTime = () => {
    const prepTime = settings.hasPrep ? 5 * 60 : 0; // 5 minutes prep
    const cycleTime = (settings.focusDuration + settings.breakDuration) * settings.loops;
    const totalSeconds = prepTime + cycleTime;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }, style]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>
          ?? Timer Settings
        </Text>
        <View style={[styles.totalTimeContainer, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.totalTimeLabel, { color: colors.primary }]}>
            Total Session Time
          </Text>
          <Text style={[styles.totalTime, { color: colors.primary }]}>
            {calculateTotalTime()}
          </Text>
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.settingsContainer}>
        
        {/* Prep Phase Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ??¡ð? Preparation Phase
          </Text>
          
          <ToggleSwitch
            isEnabled={settings.hasPrep}
            onToggle={(enabled) => updateSetting('hasPrep', enabled)}
            label="5-Minute Prep Session"
            description="Get mentally prepared before starting your focus session"
            style={styles.settingItem}
          />
        </View>

        {/* Duration Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ?? Session Duration
          </Text>
          
          <View style={styles.durationContainer}>
            <TimeSlider
              label="Focus Duration"
              value={settings.focusDuration}
              onValueChange={(value) => updateSetting('focusDuration', Math.max(30, value))}
              min={30} // Minimum 30 seconds focus
              max={120 * 60} // Maximum 2 hours
              step={30} // 30 second increments
            />
            
            <TimeSlider
              label="Break Duration"
              value={settings.breakDuration}
              onValueChange={(value) => updateSetting('breakDuration', value)}
              min={0} // Breaks can be 0
              max={60 * 60} // Maximum 1 hour
              step={30} // 30 second increments
            />
          </View>
        </View>

        {/* Loops Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ? Repetition
          </Text>
          
          <View style={styles.loopsContainer}>
            <Text style={[styles.loopsLabel, { color: colors.text }]}>
              Number of Focus/Break Cycles
            </Text>
            <View style={styles.loopsButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.loopButton,
                    {
                      backgroundColor: settings.loops === num 
                        ? colors.accent 
                        : colors.background,
                      borderColor: colors.accent,
                    },
                  ]}
                  onPress={() => updateSetting('loops', num)}
                >
                  <Text
                    style={[
                      styles.loopButtonText,
                      {
                        color: settings.loops === num 
                          ? colors.surface 
                          : colors.accent,
                      },
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Display Preferences */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ? Display Preferences
          </Text>
          
          <ToggleSwitch
            isEnabled={settings.countUp}
            onToggle={(enabled) => updateSetting('countUp', enabled)}
            label="Count Up Timer"
            description="Show elapsed time instead of remaining time"
            style={styles.settingItem}
          />
        </View>

        {/* Preview Section */}
        <View style={[styles.section, { backgroundColor: colors.info + '20' }]}>
          <Text style={[styles.sectionTitle, { color: colors.info }]}>
            ? Session Preview
          </Text>
          
          <View style={styles.previewContainer}>
            {settings.hasPrep && (
              <View style={styles.previewPhase}>
                <Text style={[styles.previewPhaseText, { color: colors.info }]}>
                  ??¡ð? Prep: 5:00
                </Text>
              </View>
            )}
            
            {Array.from({ length: settings.loops }, (_, i) => (
              <React.Fragment key={i}>
                <View style={styles.previewPhase}>
                  <Text style={[styles.previewPhaseText, { color: colors.accent }]}>
                    ? Focus: {Math.floor(settings.focusDuration / 60)}:
                    {(settings.focusDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                
                {settings.breakDuration > 0 && (
                  <View style={styles.previewPhase}>
                    <Text style={[styles.previewPhaseText, { color: colors.secondary }]}>
                      ? Break: {Math.floor(settings.breakDuration / 60)}:
                      {(settings.breakDuration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },

  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  title: {
    ...Typography.largeTitle,
    marginBottom: Spacing.md,
  },

  totalTimeContainer: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    alignItems: 'center',
  },

  totalTimeLabel: {
    ...Typography.caption1,
    marginBottom: Spacing.xs2,
  },

  totalTime: {
    ...Typography.title2,
    fontWeight: '600',
  },

  settingsContainer: {
    gap: Spacing.lg,
  },

  section: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },

  settingItem: {
    paddingVertical: Spacing.sm,
  },

  durationContainer: {
    gap: Spacing.lg,
  },

  loopsContainer: {
    gap: Spacing.md,
  },

  loopsLabel: {
    ...Typography.callout,
  },

  loopsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  loopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loopButtonText: {
    ...Typography.buttonMedium,
  },

  previewContainer: {
    gap: Spacing.sm,
  },

  previewPhase: {
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius.small,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  previewPhaseText: {
    ...Typography.callout,
    textAlign: 'center',
  },
});
