import { TimerSettings as TimerSettingsComponent } from '@/components/TimerSettings';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { getRandomMessage } from '@/constants/CapybaraMessages';
import { Colors } from '@/constants/Colors';
import { Layout, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TimerSettings, useTimer } from '@/hooks/useTimer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Timer settings with realistic defaults (Pomodoro Technique)
  const [timerSettings, setTimerSettings] = useState<TimerSettings>({
    focusDuration: 25 * 60, // 25 minutes (classic Pomodoro)
    breakDuration: 5 * 60,  // 5 minutes break
    loops: 4,               // 4 Pomodoros = 2 hours work session
    hasPrep: false,         // Default to no prep - user can toggle on
    countUp: false,
  });

  // Show settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Persistent coin state
  const [totalCoins, setTotalCoins] = useState(0);
  const COINS_STORAGE_KEY = '@capy_timer_total_coins';

  // Message state for controlled timing
  const [currentMessage, setCurrentMessage] = useState(() => {
    return getRandomMessage('prep', 0);
  });
  const [lastMessageTime, setLastMessageTime] = useState(Date.now());

  // Use our timer hook
  const {
    session,
    formattedTime,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
  } = useTimer(timerSettings);

  // Reset timer when settings change (only if not running)
  React.useEffect(() => {
    if (session.state === 'idle') {
      resetTimer();
    }
  }, [timerSettings, resetTimer]);

  // Load coins on component mount
  React.useEffect(() => {
    const loadCoins = async () => {
      try {
        // Clear coins for now as requested by user
        await AsyncStorage.removeItem(COINS_STORAGE_KEY);
        setTotalCoins(0);
        console.log('? Cleared all coins as requested');
        
        // Uncomment below to restore coin loading later
        // const savedCoins = await AsyncStorage.getItem(COINS_STORAGE_KEY);
        // if (savedCoins !== null) {
        //   setTotalCoins(parseInt(savedCoins, 10));
        // }
      } catch (error) {
        console.error('Failed to load/clear coins:', error);
      }
    };
    loadCoins();
  }, []);

  // Save coins when session completes
  React.useEffect(() => {
    const saveCoins = async () => {
      try {
        const newTotal = totalCoins + session.coinsEarned;
        setTotalCoins(newTotal);
        await AsyncStorage.setItem(COINS_STORAGE_KEY, newTotal.toString());
        console.log(`? Saved ${session.coinsEarned} coins. New total: ${newTotal}`);
      } catch (error) {
        console.error('Failed to save coins:', error);
      }
    };
    
    // Only save when session completes (not during active session)
    if (session.state === 'completed' && session.coinsEarned > 0) {
      saveCoins();
    }
  }, [session.state, session.coinsEarned]); // Removed totalCoins to prevent infinite loop

  // Update message every 10+ seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastMessageTime > 10000) { // 10 seconds minimum
        const progress = session.totalSessionTime > 0 
          ? (session.timeElapsed / session.totalSessionTime) * 100 
          : 0;
        
        setCurrentMessage(getRandomMessage(session.phase, progress));
        setLastMessageTime(now);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [session.phase, session.timeElapsed, session.totalSessionTime, lastMessageTime]);

  // Show session completion alert
  const showCompletionAlert = () => {
    if (session.state === 'completed') {
      Alert.alert(
        '? Session Complete!',
        `You earned ${session.coinsEarned} coins!\nTotal focus time: ${Math.floor(session.completedFocusTime / 60)}m ${session.completedFocusTime % 60}s`,
        [{ text: 'Awesome!', onPress: resetTimer }]
      );
    }
  };

  // Show completion alert when session completes
  React.useEffect(() => {
    showCompletionAlert();
  }, [session.state]);

  // Get phase display info
  const getPhaseInfo = () => {
    switch (session.phase) {
      case 'prep':
        return { label: 'Get Ready', emoji: '??¡ð?', color: colors.info };
      case 'focus':
        return { label: 'Focus Time', emoji: '?', color: colors.timerActive };
      case 'break':
        return { label: 'Break Time', emoji: '?', color: colors.secondary };
      case 'completed':
        return { label: 'Complete!', emoji: '?', color: colors.success };
    }
  };

  const phaseInfo = getPhaseInfo();

  // Calculate total session time
  const calculateTotalSessionTime = () => {
    const prepTime = timerSettings.hasPrep ? 5 * 60 : 0; // 5 minutes prep
    const cycleTime = (timerSettings.focusDuration + timerSettings.breakDuration) * timerSettings.loops;
    const totalSeconds = prepTime + cycleTime;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Gesture handlers (temporarily disabled)
  // const handleSwipeGesture = ({ nativeEvent }: any) => {
  //   if (nativeEvent.state === State.END) {
  //     const { translationX, translationY, velocityX, velocityY } = nativeEvent;
  //     
  //     // Swipe up to open settings
  //     if (Math.abs(translationY) > Math.abs(translationX) && translationY < -100 && velocityY < -500) {
  //       setShowSettings(true);
  //       return;
  //     }
  //     
  //     // Swipe down to close settings (if open)
  //     if (Math.abs(translationY) > Math.abs(translationX) && translationY > 100 && velocityY > 500) {
  //       if (showSettings) {
  //         setShowSettings(false);
  //       }
  //       return;
  //     }
  //     
  //     // Swipe left/right for timer control (when timer is running)
  //     if (Math.abs(translationX) > Math.abs(translationY) && Math.abs(translationX) > 100) {
  //       if (session.state === 'running') {
  //         // Swipe right to pause
  //         if (translationX > 0 && velocityX > 500) {
  //           pauseTimer();
  //         }
  //         // Swipe left to skip phase  
  //         else if (translationX < 0 && velocityX < -500) {
  //           skipPhase();
  //         }
  //       } else if (session.state === 'paused' || session.state === 'idle') {
  //         // Swipe right to start/resume
  //         if (translationX > 0 && velocityX > 500) {
  //           startTimer();
  //         }
  //       }
  //     }
  //   }
  // };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>
          ? Capybara Timer Test
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {Math.floor(timerSettings.focusDuration / 60)}min Focus ? {Math.floor(timerSettings.breakDuration / 60)}min Break ? {timerSettings.loops} Loops
        </Text>
        <Text style={[styles.gestureHint, { color: colors.text }]}>
          ? Swipe up for settings ? ?? Swipe to control timer
        </Text>
        <Text style={[styles.totalTime, { color: colors.text }]}>
          Total: {calculateTotalSessionTime()}
        </Text>
      </View>

      {/* Timer Display */}
      <View style={[styles.timerContainer, { backgroundColor: colors.surface }]}>
        {/* Phase Info */}
        <Text style={[styles.phaseLabel, { color: phaseInfo.color }]}>
          {phaseInfo.emoji} {phaseInfo.label}
        </Text>
        
        {/* Timer */}
        <Text style={[styles.timerDisplay, { color: colors.primary }]}>
          {formattedTime}
        </Text>
        
        {/* Loop Progress */}
        <Text style={[styles.loopInfo, { color: colors.text }]}>
          Loop {session.currentLoop} of {timerSettings.loops}
        </Text>
        
        {/* Coins Earned */}
        <Text style={[styles.coinsInfo, { color: colors.accent }]}>
          ? {session.coinsEarned} session coins ? {totalCoins + session.coinsEarned} total
        </Text>
      </View>

      {/* Capybara Speech Bubble */}
      <View style={[styles.speechBubble, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.speechText, { color: colors.primary }]}>
          ? "{currentMessage.text}"
        </Text>
      </View>

      {/* Quick Settings - Prep Toggle */}
      <View style={[styles.quickSettingsContainer, { backgroundColor: colors.surface }]}>
        <ToggleSwitch
          isEnabled={timerSettings.hasPrep}
          onToggle={(enabled) => setTimerSettings(prev => ({ ...prev, hasPrep: enabled }))}
          label="5-Min Prep Session"
          description="Add preparation time before focus"
          disabled={session.state === 'running'} // Can't change during active session
        />
        
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.info }]}
          onPress={() => setShowSettings(true)}
          disabled={session.state === 'running'}
        >
          <Text style={[styles.settingsButtonText, { color: colors.surface }]}>
            ?? More Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        {session.state === 'idle' || session.state === 'paused' ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={startTimer}
          >
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              {session.state === 'idle' ? 'Start Timer' : 'Resume'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.timerPaused }]}
            onPress={pauseTimer}
          >
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              Pause Timer
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.buttonSecondary, { backgroundColor: colors.secondary }]}
          onPress={resetTimer}
        >
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Reset
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.buttonTertiary, { backgroundColor: colors.warning }]}
          onPress={skipPhase}
          disabled={session.state !== 'running'}
        >
          <Text style={[styles.buttonText, { 
            color: colors.surface,
            opacity: session.state !== 'running' ? 0.5 : 1 
          }]}>
            Skip Phase
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info */}
      <View style={styles.debugSection}>
        <Text style={[styles.debugTitle, { color: colors.text }]}>
          ? Debug Info
        </Text>
        <Text style={[styles.debugText, { color: colors.text }]}>
          State: {session.state} | Phase: {session.phase}
        </Text>
        <Text style={[styles.debugText, { color: colors.text }]}>
          Elapsed: {session.timeElapsed}s | Remaining: {session.timeRemaining}s
        </Text>
        <Text style={[styles.debugText, { color: colors.text }]}>
          Focus completed: {session.completedFocusTime}s
        </Text>
      </View>
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.modalCloseButton}>
              <Text style={[styles.modalCloseText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <TimerSettingsComponent
            settings={timerSettings}
            onSettingsChange={(newSettings: TimerSettings) => {
              setTimerSettings(newSettings);
              // Timer will auto-reset via useEffect when settings change
              // Don't close modal - let user continue adjusting settings
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  
  title: {
    ...Typography.largeTitle,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    opacity: 0.7,
  },
  
  gestureHint: {
    ...Typography.caption1,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  
  totalTime: {
    ...Typography.caption1,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: Spacing.xs2,
    fontWeight: '600',
  },
  
  timerContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  phaseLabel: {
    ...Typography.title2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  
  timerDisplay: {
    ...Typography.timerLarge,
    marginBottom: Spacing.sm,
  },
  
  loopInfo: {
    ...Typography.callout,
    marginBottom: Spacing.xs,
  },
  
  coinsInfo: {
    ...Typography.callout,
    fontWeight: '600',
  },
  
  speechBubble: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  
  speechText: {
    ...Typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  buttonContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  
  button: {
    height: Layout.buttonHeight.large,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  buttonSecondary: {
    height: Layout.buttonHeight.medium,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonTertiary: {
    height: Layout.buttonHeight.medium,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonText: {
    ...Typography.buttonLarge,
  },
  
  debugSection: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.small,
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
  },
  
  debugTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  
  debugText: {
    ...Typography.caption1,
    marginBottom: Spacing.xs2,
    fontFamily: 'monospace',
  },

  // Quick Settings Styles
  quickSettingsContainer: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  settingsButton: {
    height: Layout.buttonHeight.medium,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },

  settingsButtonText: {
    ...Typography.buttonMedium,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },

  modalHeader: {
    padding: Spacing.md,
    paddingTop: Spacing.xl2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    alignItems: 'flex-end',
  },

  modalCloseButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.medium,
  },

  modalCloseText: {
    ...Typography.buttonMedium,
  },

  settingsModal: {
    flex: 1,
  },
});