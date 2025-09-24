/**
 * ? Capybara Timer - Speech Bubble Messages
 * 
 * Random encouraging messages that capybaras say during timer sessions.
 * Messages are categorized by timer phase and progress.
 */

export interface CapybaraMessage {
  text: string;
  mood: 'encouraging' | 'excited' | 'calm' | 'proud';
}

// Messages for different timer phases
export const CapybaraMessages = {
  // Prep phase messages
  prep: [
    { text: "Let's get ready to focus!", mood: 'excited' as const },
    { text: "Take a deep breath", mood: 'calm' as const },
    { text: "Prepare your workspace", mood: 'calm' as const },
    { text: "You've got this!", mood: 'encouraging' as const },
    { text: "Time to get cozy", mood: 'calm' as const },
  ],

  // Focus phase messages - early (first 25% of session)
  focusEarly: [
    { text: "Great start!", mood: 'encouraging' as const },
    { text: "Let's focus together", mood: 'calm' as const },
    { text: "You're doing amazing", mood: 'encouraging' as const },
    { text: "Stay strong!", mood: 'encouraging' as const },
    { text: "I believe in you", mood: 'encouraging' as const },
    { text: "Keep going!", mood: 'encouraging' as const },
  ],

  // Focus phase messages - middle (25-75% of session)
  focusMiddle: [
    { text: "Don't give up!", mood: 'encouraging' as const },
    { text: "You're halfway there", mood: 'encouraging' as const },
    { text: "Stay focused", mood: 'calm' as const },
    { text: "Keep pushing forward", mood: 'encouraging' as const },
    { text: "You're doing great", mood: 'encouraging' as const },
    { text: "Almost there!", mood: 'excited' as const },
    { text: "Focus like a capybara", mood: 'calm' as const },
  ],

  // Focus phase messages - late (last 25% of session)
  focusLate: [
    { text: "Almost there!", mood: 'excited' as const },
    { text: "Final stretch!", mood: 'excited' as const },
    { text: "You can do it!", mood: 'encouraging' as const },
    { text: "So close now!", mood: 'excited' as const },
    { text: "Push through!", mood: 'encouraging' as const },
    { text: "The end is near!", mood: 'excited' as const },
  ],

  // Break phase messages
  break: [
    { text: "Great job! Take a rest", mood: 'proud' as const },
    { text: "You earned this break", mood: 'proud' as const },
    { text: "Relax like a capybara", mood: 'calm' as const },
    { text: "Stretch those muscles", mood: 'calm' as const },
    { text: "Recharge your energy", mood: 'calm' as const },
    { text: "Well deserved break!", mood: 'proud' as const },
  ],

  // Completion messages
  completion: [
    { text: "You did it!", mood: 'proud' as const },
    { text: "Amazing work!", mood: 'proud' as const },
    { text: "I'm so proud of you!", mood: 'proud' as const },
    { text: "Perfect focus session!", mood: 'proud' as const },
    { text: "You're incredible!", mood: 'proud' as const },
    { text: "Mission accomplished!", mood: 'excited' as const },
  ],

  // Paused messages
  paused: [
    { text: "Take your time", mood: 'calm' as const },
    { text: "I'll wait for you", mood: 'calm' as const },
    { text: "Ready when you are", mood: 'calm' as const },
    { text: "No rush, friend", mood: 'calm' as const },
  ],
};

// Get random message for current timer state
export const getRandomMessage = (
  phase: 'prep' | 'focus' | 'break' | 'completed' | 'paused',
  progressPercentage?: number
): CapybaraMessage => {
  let messagePool: CapybaraMessage[];

  switch (phase) {
    case 'prep':
      messagePool = CapybaraMessages.prep;
      break;
    case 'focus':
      // Choose message based on progress
      if (progressPercentage === undefined) {
        messagePool = CapybaraMessages.focusMiddle;
      } else if (progressPercentage < 25) {
        messagePool = CapybaraMessages.focusEarly;
      } else if (progressPercentage < 75) {
        messagePool = CapybaraMessages.focusMiddle;
      } else {
        messagePool = CapybaraMessages.focusLate;
      }
      break;
    case 'break':
      messagePool = CapybaraMessages.break;
      break;
    case 'completed':
      messagePool = CapybaraMessages.completion;
      break;
    case 'paused':
      messagePool = CapybaraMessages.paused;
      break;
    default:
      messagePool = CapybaraMessages.focusMiddle;
  }

  const randomIndex = Math.floor(Math.random() * messagePool.length);
  return messagePool[randomIndex];
};

// Get message with some randomness (don't show too frequently)
export const shouldShowMessage = (lastMessageTime: number, currentTime: number): boolean => {
  const timeSinceLastMessage = currentTime - lastMessageTime;
  const minInterval = 10000; // Minimum 10 seconds between messages
  const maxInterval = 20000; // Maximum 20 seconds between messages
  
  // Random chance to show message after minimum interval
  if (timeSinceLastMessage > minInterval) {
    const randomChance = Math.random();
    const timeProgress = Math.min((timeSinceLastMessage - minInterval) / (maxInterval - minInterval), 1);
    return randomChance < timeProgress * 0.4; // Up to 40% chance
  }
  
  return false;
};
