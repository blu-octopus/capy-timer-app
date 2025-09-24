/**
 * ? Capybara Timer - Companion System
 * 
 * Defines all capybara companions, their unlock requirements,
 * and associated assets/animations.
 */

export interface Companion {
  id: string;
  name: string;
  description: string;
  unlockCost: number; // coins required to unlock (0 = free)
  isUnlocked: boolean; // will be managed by user data
  assets: {
    idle: string;      // idle animation asset path
    working: string;   // working animation asset path
    celebrating: string; // celebration animation asset path
    locked?: string;   // locked state image (optional)
  };
  personality: {
    messageFrequency: number; // 0.1 to 1.0 (how chatty they are)
    preferredMessages: ('encouraging' | 'excited' | 'calm' | 'proud')[];
  };
}

export const COMPANIONS: Companion[] = [
  {
    id: 'basic-capy',
    name: 'Basic Capy',
    description: 'Your loyal study companion',
    unlockCost: 0, // Free starter companion
    isUnlocked: true,
    assets: {
      idle: 'basic-capy-idle.gif',
      working: 'basic-capy-working.gif',
      celebrating: 'basic-capy-celebrating.gif',
    },
    personality: {
      messageFrequency: 0.5,
      preferredMessages: ['encouraging', 'calm'],
    },
  },
  {
    id: 'fighting-capy',
    name: 'Fighting Capy',
    description: 'Ready to battle procrastination!',
    unlockCost: 500, // 500 coins to unlock
    isUnlocked: false,
    assets: {
      idle: 'fighting-capy-idle.gif',
      working: 'fighting-capy-working.gif',
      celebrating: 'fighting-capy-celebrating.gif',
      locked: 'fighting-capy-locked.png',
    },
    personality: {
      messageFrequency: 0.8, // More chatty
      preferredMessages: ['encouraging', 'excited'],
    },
  },
  {
    id: 'egg-capy',
    name: 'Egg Capy',
    description: 'Cozy and warm focus buddy',
    unlockCost: 1000, // 1000 coins to unlock
    isUnlocked: false,
    assets: {
      idle: 'egg-capy-idle.gif',
      working: 'egg-capy-working.gif',
      celebrating: 'egg-capy-celebrating.gif',
      locked: 'egg-capy-locked.png',
    },
    personality: {
      messageFrequency: 0.3, // Less chatty, more zen
      preferredMessages: ['calm', 'encouraging'],
    },
  },
  {
    id: 'toilet-capy',
    name: 'Toilet Capy',
    description: 'For those bathroom break sessions',
    unlockCost: 2500, // Premium companion
    isUnlocked: false,
    assets: {
      idle: 'toilet-capy-idle.gif',
      working: 'toilet-capy-working.gif',
      celebrating: 'toilet-capy-celebrating.gif',
      locked: 'toilet-capy-locked.png',
    },
    personality: {
      messageFrequency: 0.6,
      preferredMessages: ['excited', 'encouraging'],
    },
  },
];

// Helper functions for companion management
export const getCompanionById = (id: string): Companion | undefined => {
  return COMPANIONS.find(companion => companion.id === id);
};

export const getUnlockedCompanions = (unlockedIds: string[]): Companion[] => {
  return COMPANIONS.filter(companion => 
    companion.unlockCost === 0 || unlockedIds.includes(companion.id)
  );
};

export const getLockedCompanions = (unlockedIds: string[]): Companion[] => {
  return COMPANIONS.filter(companion => 
    companion.unlockCost > 0 && !unlockedIds.includes(companion.id)
  );
};

export const canUnlockCompanion = (companion: Companion, currentCoins: number): boolean => {
  return currentCoins >= companion.unlockCost;
};

// Calculate coins earned from focus time
export const calculateCoinsEarned = (focusTimeInSeconds: number): number => {
  // 1 coin per minute of focus time
  return Math.floor(focusTimeInSeconds / 60);
};

// Get companion animation based on current state
export const getCompanionAnimation = (
  companion: Companion,
  timerState: 'idle' | 'running' | 'paused' | 'completed',
  timerPhase: 'prep' | 'focus' | 'break' | 'completed'
): string => {
  if (timerState === 'completed' || timerPhase === 'completed') {
    return companion.assets.celebrating;
  } else if (timerState === 'running' && (timerPhase === 'focus' || timerPhase === 'prep')) {
    return companion.assets.working;
  } else {
    return companion.assets.idle;
  }
};
