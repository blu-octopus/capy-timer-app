/**
 * ? Capybara Unlock Screen Component
 * 
 * Demonstrates the head-only animation system for unlock/selection screens.
 * Shows locked capybaras with their unlock costs and allows purchasing.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Layout, Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CapybaraHead } from './CapybaraAnimation';
import { useCapybaraAnimations } from '@/hooks/useCapybaraAnimations';
import { CAPYBARA_ANIMATION_SETS } from '@/constants/CapybaraAnimations';

interface CapybaraUnlockScreenProps {
  currentCoins: number;
  onPurchase: (capybaraId: string, cost: number) => void;
  onSelect: (capybaraId: string) => void;
}

export const CapybaraUnlockScreen: React.FC<CapybaraUnlockScreenProps> = ({
  currentCoins,
  onPurchase,
  onSelect,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const {
    selectedCapybaraId,
    unlockedCapybaras,
    unlockCapybara,
    selectCapybara,
    isCapybaraUnlocked,
  } = useCapybaraAnimations();

  const handleUnlock = (capybaraId: string, cost: number) => {
    if (currentCoins < cost) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${cost} coins to unlock this capybara. You have ${currentCoins} coins.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Unlock Capybara?',
      `Spend ${cost} coins to unlock this capybara?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: () => {
            if (unlockCapybara(capybaraId, currentCoins)) {
              onPurchase(capybaraId, cost);
            }
          },
        },
      ]
    );
  };

  const handleSelect = (capybaraId: string) => {
    if (selectCapybara(capybaraId)) {
      onSelect(capybaraId);
    }
  };

  const renderCapybaraCard = (capybara: any) => {
    const isUnlocked = isCapybaraUnlocked(capybara.id);
    const isSelected = selectedCapybaraId === capybara.id;
    const canAfford = currentCoins >= capybara.unlockCost;

    return (
      <View
        key={capybara.id}
        style={[
          styles.capybaraCard,
          { backgroundColor: colors.surface },
          isSelected && { borderColor: colors.accent, borderWidth: 3 },
        ]}
      >
        {/* Capybara Head Animation */}
        <View style={styles.headContainer}>
          <CapybaraHead
            capybaraId={capybara.id}
            expression={isSelected ? 'happy' : 'neutral'}
            scale="medium"
            style={[
              styles.headAnimation,
              !isUnlocked && styles.lockedHead,
            ]}
          />
          
          {/* Lock Overlay */}
          {!isUnlocked && (
            <View style={[styles.lockOverlay, { backgroundColor: colors.surface }]}>
              <Text style={[styles.lockIcon, { color: colors.text }]}>?</Text>
            </View>
          )}
        </View>

        {/* Capybara Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.capybaraName, { color: colors.text }]}>
            {capybara.name}
          </Text>
          <Text style={[styles.capybaraDescription, { color: colors.text }]}>
            {capybara.description}
          </Text>

          {/* Action Button */}
          {isUnlocked ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                isSelected
                  ? { backgroundColor: colors.success }
                  : { backgroundColor: colors.accent },
              ]}
              onPress={() => handleSelect(capybara.id)}
            >
              <Text style={[styles.buttonText, { color: colors.surface }]}>
                {isSelected ? '? Selected' : 'Select'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: canAfford ? colors.warning : colors.error,
                  opacity: canAfford ? 1 : 0.6,
                },
              ]}
              onPress={() => handleUnlock(capybara.id, capybara.unlockCost)}
              disabled={!canAfford}
            >
              <Text style={[styles.buttonText, { color: colors.surface }]}>
                ? {capybara.unlockCost} coins
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>
          ? Capybara Collection
        </Text>
        <Text style={[styles.coinsDisplay, { color: colors.accent }]}>
          ? {currentCoins} coins
        </Text>
      </View>

      {/* Capybara Grid */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {CAPYBARA_ANIMATION_SETS.map(renderCapybaraCard)}
        </View>
        
        {/* Instructions */}
        <View style={[styles.instructionsContainer, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.instructionsText, { color: colors.primary }]}>
            ? Earn coins by completing focus sessions to unlock new capybara companions!
          </Text>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: Spacing.sm,
  },

  coinsDisplay: {
    ...Typography.title2,
    fontWeight: '600',
  },

  scrollContainer: {
    flex: 1,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },

  capybaraCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  headContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },

  headAnimation: {
    // CapybaraHead component handles its own sizing
  },

  lockedHead: {
    opacity: 0.3,
  },

  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.medium,
    opacity: 0.9,
  },

  lockIcon: {
    fontSize: 24,
  },

  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },

  capybaraName: {
    ...Typography.title3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  capybaraDescription: {
    ...Typography.caption1,
    textAlign: 'center',
    marginBottom: Spacing.md,
    opacity: 0.8,
  },

  actionButton: {
    width: '100%',
    height: Layout.buttonHeight.medium,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    ...Typography.buttonMedium,
  },

  instructionsContainer: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl2,
  },

  instructionsText: {
    ...Typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
