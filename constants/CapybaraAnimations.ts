/**
 * ? Capybara Animation System - Data Definitions
 * 
 * Contains all capybara animation sets and configuration.
 * Easy to expand with new capybaras by adding new entries.
 */

import { BodyAnimation, CapybaraAnimationSet, ScaleConfig } from '@/types/CapybaraAnimations';

// ? DEFAULT BODY ANIMATIONS (shared across all capybaras)
export const DEFAULT_BODY_ANIMATIONS: BodyAnimation = {
  idle: {
    source: require('@/assets/images/react-logo.png'), // Temporary placeholder
    width: 200,
    height: 180,
    duration: 2000,
    loop: true,
  },
  dance: {
    source: require('@/assets/images/react-logo.png'), // Temporary placeholder
    width: 200,
    height: 180,
    duration: 1500,
    loop: true,
  },
};

// ? SCALE CONFIGURATIONS
export const SCALE_CONFIGS: ScaleConfig = {
  small: {
    bodyScale: 0.4,
    headScale: 0.4,
    containerSize: { width: 80, height: 80 },
  },
  medium: {
    bodyScale: 0.7,
    headScale: 0.7,
    containerSize: { width: 140, height: 140 },
  },
  large: {
    bodyScale: 1.0,
    headScale: 1.0,
    containerSize: { width: 200, height: 200 },
  },
};

// ? CAPYBARA ANIMATION SETS
export const CAPYBARA_ANIMATION_SETS: CapybaraAnimationSet[] = [
  {
    id: 'basic-capy',
    name: 'Basic Capy',
    description: 'Your loyal and chill first companion.',
    unlockCost: 0, // Free starter capybara
    isUnlocked: true,
    
    head: {
      neutral: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 80,
        height: 80,
        duration: 3000,
        loop: true,
      },
      happy: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 80,
        height: 80,
        duration: 2000,
        loop: true,
      },
    },
    
    headOffset: { x: 0, y: -20 }, // Position head 20px above body center
    headScale: 1.0,
  },
  
  {
    id: 'fighting-capy',
    name: 'Fighting Capy',
    description: 'A determined capybara ready to tackle any challenge.',
    unlockCost: 100,
    isUnlocked: false,
    
    head: {
      neutral: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 85,
        height: 85,
        duration: 2500,
        loop: true,
      },
      happy: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 85,
        height: 85,
        duration: 1800,
        loop: true,
      },
    },
    
    headOffset: { x: 0, y: -22 },
    headScale: 1.1, // Slightly larger head for fighting capy
  },
  
  {
    id: 'egg-capy',
    name: 'Egg Capy',
    description: 'A mysterious capybara, perhaps still hatching ideas.',
    unlockCost: 250,
    isUnlocked: false,
    
    head: {
      neutral: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 75,
        height: 90, // Taller for egg shape
        duration: 4000,
        loop: true,
      },
      happy: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 75,
        height: 90,
        duration: 2200,
        loop: true,
      },
    },
    
    headOffset: { x: 0, y: -25 },
    headScale: 0.9,
  },
  
  {
    id: 'toilet-capy',
    name: 'Toilet Capy',
    description: 'A capybara who finds peace in the most unexpected places.',
    unlockCost: 500,
    isUnlocked: false,
    
    head: {
      neutral: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 82,
        height: 78,
        duration: 3500,
        loop: true,
      },
      happy: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 82,
        height: 78,
        duration: 2000,
        loop: true,
      },
    },
    
    headOffset: { x: 0, y: -18 },
    headScale: 1.0,
  },
  
  // ? FUTURE CAPYBARAS - Easy to add new ones here!
  /*
  {
    id: 'ninja-capy',
    name: 'Ninja Capy',
    description: 'A stealthy capybara master of focus.',
    unlockCost: 750,
    isUnlocked: false,
    
    head: {
      neutral: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 80,
        height: 80,
        duration: 2800,
        loop: true,
      },
      happy: {
        source: require('@/assets/images/react-logo.png'), // Temporary placeholder
        width: 80,
        height: 80,
        duration: 1900,
        loop: true,
      },
    },
    
    headOffset: { x: 0, y: -20 },
    headScale: 1.0,
  },
  */
];

// ? UTILITY FUNCTIONS
export const getCapybaraById = (id: string): CapybaraAnimationSet | undefined => {
  return CAPYBARA_ANIMATION_SETS.find(capy => capy.id === id);
};

export const getUnlockedCapybaras = (): CapybaraAnimationSet[] => {
  return CAPYBARA_ANIMATION_SETS.filter(capy => capy.isUnlocked);
};

export const getLockedCapybaras = (): CapybaraAnimationSet[] => {
  return CAPYBARA_ANIMATION_SETS.filter(capy => !capy.isUnlocked);
};

export const canUnlockCapybara = (id: string, currentCoins: number): boolean => {
  const capy = getCapybaraById(id);
  return capy ? !capy.isUnlocked && currentCoins >= capy.unlockCost : false;
};

// Get the body animation to use (default or capybara-specific)
export const getBodyAnimation = (capybaraId: string): BodyAnimation => {
  const capy = getCapybaraById(capybaraId);
  return capy?.body || DEFAULT_BODY_ANIMATIONS;
};
