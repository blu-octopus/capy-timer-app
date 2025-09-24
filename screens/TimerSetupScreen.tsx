/**
 * ?? Timer Setup Screen
 * 
 * Complete timer configuration screen matching the Figma design.
 * Includes companion selection, time sliders, toggles, and category selection.
 */

import { CapybaraAnimation } from '@/components/CapybaraAnimation';
import { CategoryModal } from '@/components/CategoryModal';
import { TimeSlider } from '@/components/TimeSlider';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { Colors } from '@/constants/Colors';
import { Layout, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useCapybaraAnimations } from '@/hooks/useCapybaraAnimations';
import { useCategories } from '@/hooks/useCategories';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TimerSettings } from '@/hooks/useTimer';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface TimerSetupScreenProps {
  initialSettings: TimerSettings;
  onSettingsChange: (settings: TimerSettings) => void;
  onStartTimer: () => void;
  userCoins: number;
}

export const TimerSetupScreen: React.FC<TimerSetupScreenProps> = ({
  initialSettings,
  onSettingsChange,
  onStartTimer,
  userCoins,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const { getSelectedCategory } = useCategories();
  const { selectedCapybaraId, getSelectedCapybara } = useCapybaraAnimations();
  
  const [settings, setSettings] = useState<TimerSettings>(initialSettings);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const selectedCategory = getSelectedCategory();
  const selectedCapybara = getSelectedCapybara();

  // Update settings and notify parent
  const updateSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  // Helper to update a single setting
  const updateSetting = <K extends keyof TimerSettings>(
    key: K,
    value: TimerSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    updateSettings(newSettings);
  };

  // Calculate total time
  const calculateTotalTime = () => {
    const prepTime = settings.hasPrep ? 5 * 60 : 0;
    const cycleTime = (settings.focusDuration + settings.breakDuration) * settings.loops;
    const totalSeconds = prepTime + cycleTime;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes.toString().padStart(2, '0')} min`;
    } else {
      return `${minutes} min`;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          timer setup- 1
        </Text>
        
        <View style={styles.headerIcons}>
          {/* Coins Display */}
          <View style={[styles.coinsContainer, { backgroundColor: colors.accent }]}>
            <Text style={[styles.coinsText, { color: colors.surface }]}>
              ? {userCoins}
            </Text>
          </View>
          
          {/* Stats Icon */}
          <TouchableOpacity style={styles.statsIcon}>
            <Text style={[styles.statsText, { color: colors.accent }]}>?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Companion Selection */}
        <View style={styles.companionSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Pick Your Buddy
          </Text>
          
          <View style={styles.companionContainer}>
            {/* Left Arrow */}
            <TouchableOpacity style={styles.arrowButton}>
              <Text style={[styles.arrow, { color: colors.accent }]}>?</Text>
            </TouchableOpacity>
            
            {/* Capybara Animation */}
            <View style={styles.capybaraContainer}>
              <CapybaraAnimation
                capybaraId={selectedCapybaraId}
                bodyAnimation="idle"
                headExpression="neutral"
                scale="large"
              />
            </View>
            
            {/* Right Arrow */}
            <TouchableOpacity style={styles.arrowButton}>
              <Text style={[styles.arrow, { color: colors.accent }]}>?</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.companionName, { color: colors.accent }]}>
            {selectedCapybara?.name || 'Basic Capy'}
          </Text>
        </View>

        {/* Session Details */}
        <View style={[styles.sessionContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sessionTitle, { color: colors.text }]}>
            Session Details
          </Text>

          {/* Focus Duration */}
          <TimeSlider
            label="Focus Duration"
            value={settings.focusDuration}
            onValueChange={(value) => updateSetting('focusDuration', Math.max(30, value))}
            minimumValue={30}
            maximumValue={120 * 60} // 2 hours
            step={30}
          />

          {/* Break Duration */}
          <TimeSlider
            label="Break Duration"
            value={settings.breakDuration}
            onValueChange={(value) => updateSetting('breakDuration', value)}
            minimumValue={0}
            maximumValue={60 * 60} // 1 hour
            step={30}
          />

          {/* Session Loops */}
          <View style={styles.loopsSection}>
            <View style={styles.loopsHeader}>
              <Text style={[styles.loopsLabel, { color: colors.text }]}>
                Session
              </Text>
              <Text style={[styles.loopsValue, { color: colors.accent }]}>
                {settings.loops} loops
              </Text>
            </View>
            
            <View style={styles.loopsButtons}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.loopButton,
                    {
                      backgroundColor: settings.loops === num 
                        ? colors.accent 
                        : 'transparent',
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

          {/* Prep Toggle */}
          <ToggleSwitch
            isEnabled={settings.hasPrep}
            onToggle={(enabled) => updateSetting('hasPrep', enabled)}
            label="Prep"
            style={styles.prepToggle}
          />

          {/* Total Time */}
          <View style={styles.totalTimeSection}>
            <Text style={[styles.totalTimeLabel, { color: colors.text }]}>
              Total Time:
            </Text>
            <Text style={[styles.totalTimeValue, { color: colors.accent }]}>
              {calculateTotalTime()}
            </Text>
          </View>

          {/* Count Up/Down Toggle */}
          <View style={styles.countToggleContainer}>
            <TouchableOpacity
              style={[
                styles.countToggle,
                !settings.countUp && { backgroundColor: colors.accent }
              ]}
              onPress={() => updateSetting('countUp', false)}
            >
              <Text
                style={[
                  styles.countToggleText,
                  { color: !settings.countUp ? colors.surface : colors.text }
                ]}
              >
                Count Down
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.countToggle,
                settings.countUp && { backgroundColor: colors.accent }
              ]}
              onPress={() => updateSetting('countUp', true)}
            >
              <Text
                style={[
                  styles.countToggleText,
                  { color: settings.countUp ? colors.surface : colors.text }
                ]}
              >
                Count Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <View style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>
              Category
            </Text>
            
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <View
                style={[
                  styles.categoryColor,
                  { backgroundColor: selectedCategory?.color || '#4CAF50' }
                ]}
              />
              <Text style={[styles.categoryName, { color: colors.text }]}>
                {selectedCategory?.name || 'study'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.accent }]}
          onPress={onStartTimer}
        >
          <Text style={[styles.startButtonText, { color: colors.surface }]}>
            Start Timer
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Modal */}
      <CategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },

  screenTitle: {
    ...Typography.title3,
    opacity: 0.6,
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  coinsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },

  coinsText: {
    ...Typography.callout,
    fontWeight: '600',
  },

  statsIcon: {
    padding: Spacing.sm,
  },

  statsText: {
    fontSize: 20,
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  companionSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl2,
  },

  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.xl,
  },

  companionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },

  arrowButton: {
    padding: Spacing.lg,
  },

  arrow: {
    fontSize: 24,
    fontWeight: '700',
  },

  capybaraContainer: {
    marginHorizontal: Spacing.xl,
  },

  companionName: {
    ...Typography.title2,
    fontWeight: '600',
  },

  sessionContainer: {
    padding: Spacing.xl,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  sessionTitle: {
    ...Typography.title2,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },

  loopsSection: {
    marginVertical: Spacing.lg,
  },

  loopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  loopsLabel: {
    ...Typography.callout,
    fontWeight: '600',
  },

  loopsValue: {
    ...Typography.title3,
    fontWeight: '700',
  },

  loopsButtons: {
    flexDirection: 'row',
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
    fontWeight: '600',
  },

  prepToggle: {
    marginVertical: Spacing.lg,
  },

  totalTimeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },

  totalTimeLabel: {
    ...Typography.callout,
    fontWeight: '600',
  },

  totalTimeValue: {
    ...Typography.title3,
    fontWeight: '700',
  },

  countToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: Layout.borderRadius.full,
    padding: Spacing.xs2,
    marginVertical: Spacing.lg,
  },

  countToggle: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    alignItems: 'center',
  },

  countToggleText: {
    ...Typography.callout,
    fontWeight: '600',
  },

  categorySection: {
    marginTop: Spacing.lg,
  },

  categoryTitle: {
    ...Typography.title3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },

  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },

  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.md,
  },

  categoryName: {
    ...Typography.callout,
  },

  startButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    marginVertical: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  startButtonText: {
    ...Typography.title2,
    fontWeight: '700',
  },
});
