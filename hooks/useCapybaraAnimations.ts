/**
 * ? Capybara Animation Management Hook
 * 
 * Manages capybara selection, unlocking, and animation states.
 * Integrates with the timer system for dynamic expressions.
 */

import {
    canUnlockCapybara,
    CAPYBARA_ANIMATION_SETS,
    getCapybaraById
} from '@/constants/CapybaraAnimations';
import {
    BodyAnimationType,
    CapybaraAnimationSet,
    HeadExpressionType
} from '@/types/CapybaraAnimations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { TimerPhase } from './useTimer';

const STORAGE_KEYS = {
  UNLOCKED_CAPYBARAS: '@capy_timer_unlocked_capybaras',
  SELECTED_CAPYBARA: '@capy_timer_selected_capybara',
};

export const useCapybaraAnimations = () => {
  const [unlockedCapybaras, setUnlockedCapybaras] = useState<string[]>(['basic-capy']);
  const [selectedCapybaraId, setSelectedCapybaraId] = useState<string>('basic-capy');
  const [currentBodyAnimation, setCurrentBodyAnimation] = useState<BodyAnimationType>('idle');
  const [currentHeadExpression, setCurrentHeadExpression] = useState<HeadExpressionType>('neutral');

  // Load saved data on mount
  useEffect(() => {
    loadCapybaraData();
  }, []);

  // Save data when unlocked capybaras change
  useEffect(() => {
    saveCapybaraData();
  }, [unlockedCapybaras, selectedCapybaraId]);

  // ? STORAGE FUNCTIONS
  const loadCapybaraData = async () => {
    try {
      const [unlockedData, selectedData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED_CAPYBARAS),
        AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CAPYBARA),
      ]);

      if (unlockedData) {
        const unlocked = JSON.parse(unlockedData);
        setUnlockedCapybaras(unlocked);
      }

      if (selectedData) {
        setSelectedCapybaraId(selectedData);
      }
    } catch (error) {
      console.error('Failed to load capybara data:', error);
    }
  };

  const saveCapybaraData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED_CAPYBARAS, JSON.stringify(unlockedCapybaras)),
        AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CAPYBARA, selectedCapybaraId),
      ]);
    } catch (error) {
      console.error('Failed to save capybara data:', error);
    }
  };

  // ? UNLOCK FUNCTIONS
  const unlockCapybara = useCallback((capybaraId: string, currentCoins: number): boolean => {
    const capybara = getCapybaraById(capybaraId);
    
    if (!capybara) {
      console.error(`Capybara ${capybaraId} not found`);
      return false;
    }

    if (unlockedCapybaras.includes(capybaraId)) {
      console.log(`Capybara ${capybaraId} already unlocked`);
      return true;
    }

    if (!canUnlockCapybara(capybaraId, currentCoins)) {
      console.log(`Not enough coins to unlock ${capybaraId}`);
      return false;
    }

    // Unlock the capybara
    setUnlockedCapybaras(prev => [...prev, capybaraId]);
    console.log(`? Unlocked ${capybara.name}!`);
    return true;
  }, [unlockedCapybaras]);

  // ? SELECTION FUNCTIONS
  const selectCapybara = useCallback((capybaraId: string): boolean => {
    if (!unlockedCapybaras.includes(capybaraId)) {
      console.error(`Cannot select locked capybara: ${capybaraId}`);
      return false;
    }

    setSelectedCapybaraId(capybaraId);
    console.log(`Selected capybara: ${capybaraId}`);
    return true;
  }, [unlockedCapybaras]);

  // ? ANIMATION CONTROL FUNCTIONS
  const setBodyAnimation = useCallback((animation: BodyAnimationType) => {
    setCurrentBodyAnimation(animation);
  }, []);

  const setHeadExpression = useCallback((expression: HeadExpressionType) => {
    setCurrentHeadExpression(expression);
  }, []);

  // ? TIMER INTEGRATION - Update animations based on timer phase
  const updateAnimationsForTimerPhase = useCallback((phase: TimerPhase, isActive: boolean = false) => {
    switch (phase) {
      case 'prep':
        setCurrentBodyAnimation('idle');
        setCurrentHeadExpression('neutral');
        break;
        
      case 'focus':
        setCurrentBodyAnimation(isActive ? 'idle' : 'idle'); // Could add 'focus' animation later
        setCurrentHeadExpression('neutral');
        break;
        
      case 'break':
        setCurrentBodyAnimation('dance');
        setCurrentHeadExpression('happy');
        break;
        
      case 'completed':
        setCurrentBodyAnimation('dance');
        setCurrentHeadExpression('happy');
        // Celebrate for a few seconds, then return to idle
        setTimeout(() => {
          setCurrentBodyAnimation('idle');
          setCurrentHeadExpression('happy');
        }, 3000);
        break;
        
      default:
        setCurrentBodyAnimation('idle');
        setCurrentHeadExpression('neutral');
    }
  }, []);

  // ? CELEBRATION ANIMATION
  const triggerCelebration = useCallback((duration: number = 3000) => {
    setCurrentBodyAnimation('dance');
    setCurrentHeadExpression('happy');
    
    setTimeout(() => {
      setCurrentBodyAnimation('idle');
      setCurrentHeadExpression('neutral');
    }, duration);
  }, []);

  // ? GETTER FUNCTIONS
  const getSelectedCapybara = useCallback((): CapybaraAnimationSet | undefined => {
    return getCapybaraById(selectedCapybaraId);
  }, [selectedCapybaraId]);

  const getUnlockedCapybaraList = useCallback((): CapybaraAnimationSet[] => {
    return CAPYBARA_ANIMATION_SETS.filter(capy => unlockedCapybaras.includes(capy.id));
  }, [unlockedCapybaras]);

  const getLockedCapybaraList = useCallback((): CapybaraAnimationSet[] => {
    return CAPYBARA_ANIMATION_SETS.filter(capy => !unlockedCapybaras.includes(capy.id));
  }, [unlockedCapybaras]);

  const isCapybaraUnlocked = useCallback((capybaraId: string): boolean => {
    return unlockedCapybaras.includes(capybaraId);
  }, [unlockedCapybaras]);

  return {
    // State
    selectedCapybaraId,
    currentBodyAnimation,
    currentHeadExpression,
    unlockedCapybaras,
    
    // Actions
    unlockCapybara,
    selectCapybara,
    setBodyAnimation,
    setHeadExpression,
    updateAnimationsForTimerPhase,
    triggerCelebration,
    
    // Getters
    getSelectedCapybara,
    getUnlockedCapybaraList,
    getLockedCapybaraList,
    isCapybaraUnlocked,
  };
};
