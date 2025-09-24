/**
 * ? Capybara Timer - Core Timer Logic
 * 
 * Custom hook that manages all timer functionality:
 * - Focus/Break cycles with loops
 * - Count up/down modes
 * - Prep session support
 * - Coin calculation (1 coin = 1 min focus time)
 * 
 * TIMER FLOW:
 * 1. [Optional] Prep Phase (5 minutes) - Get ready for focus
 * 2. Focus Phase (user-defined duration) - Main work time
 * 3. [Optional] Break Phase (user-defined duration) - Rest time
 * 4. Repeat steps 2-3 for specified number of loops
 * 5. Completed Phase - Session finished
 * 
 * COIN SYSTEM:
 * - 1 coin = 1 minute of completed focus time
 * - Coins awarded only when focus phase completes naturally
 * - No coins awarded for skipped focus phases
 * - Coins are calculated based on actual elapsed time, not full duration
 * 
 * KEY FUNCTIONS:
 * - tick(): Called every second to update timer
 * - moveToNextPhase(): Transitions between phases and calculates coins
 * - startTimer/pauseTimer/resetTimer: Timer controls
 * - skipPhase(): Skip current phase (no coins for skipped focus)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerPhase = 'prep' | 'focus' | 'break' | 'completed';
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerSettings {
  focusDuration: number;    // in seconds (minimum 30)
  breakDuration: number;    // in seconds (can be 0)
  loops: number;           // 1-9 loops
  hasPrep: boolean;        // 5-minute prep session
  countUp: boolean;        // true = count up, false = count down
}

export interface TimerSession {
  phase: TimerPhase;
  state: TimerState;
  currentLoop: number;
  totalLoops: number;
  timeElapsed: number;     // seconds elapsed in current phase
  timeRemaining: number;   // seconds remaining in current phase
  totalSessionTime: number; // total time for current phase
  coinsEarned: number;     // coins earned so far
  completedFocusTime: number; // total completed focus time in seconds
}

const PREP_DURATION = 5 * 60; // 5 minutes in seconds

export const useTimer = (settings: TimerSettings) => {
  // Timer state
  const [session, setSession] = useState<TimerSession>({
    phase: settings.hasPrep ? 'prep' : 'focus',
    state: 'idle',
    currentLoop: 1,
    totalLoops: settings.loops,
    timeElapsed: 0,
    timeRemaining: settings.hasPrep ? PREP_DURATION : settings.focusDuration,
    totalSessionTime: settings.hasPrep ? PREP_DURATION : settings.focusDuration,
    coinsEarned: 0,
    completedFocusTime: 0,
  });

  // Timer interval reference
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate total session duration
  const getTotalDuration = useCallback(() => {
    const prepTime = settings.hasPrep ? PREP_DURATION : 0;
    const cycleTime = (settings.focusDuration + settings.breakDuration) * settings.loops;
    return prepTime + cycleTime;
  }, [settings]);

  // Get current phase duration
  const getCurrentPhaseDuration = useCallback((phase: TimerPhase): number => {
    switch (phase) {
      case 'prep':
        return PREP_DURATION;
      case 'focus':
        return settings.focusDuration;
      case 'break':
        return settings.breakDuration;
      case 'completed':
        return 0;
    }
  }, [settings]);

  // Calculate display time based on count up/down preference
  const getDisplayTime = useCallback(() => {
    if (settings.countUp) {
      return session.timeElapsed;
    } else {
      return session.timeRemaining;
    }
  }, [session.timeElapsed, session.timeRemaining, settings.countUp]);

  // Format time for display (MM:SS)
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Move to next phase
  const moveToNextPhase = useCallback((isSkipped = false) => {
    setSession(prev => {
      let nextPhase: TimerPhase;
      let nextLoop = prev.currentLoop;
      let coinsToAdd = 0;
      let completedFocusTime = prev.completedFocusTime;

      // ? COIN CALCULATION LOGIC
      // Award coins if completing a focus phase (but NOT if skipped)
      if (prev.phase === 'focus' && !isSkipped) {
        // Award coins based on actual time completed, not just full duration
        // Rule: 1 coin = 30 seconds of focus time (more rewarding for short sessions)
        const actualFocusTime = prev.timeElapsed;
        const focusMinutesCompleted = Math.floor(actualFocusTime / 30); // 30 second intervals
        coinsToAdd = focusMinutesCompleted;
        completedFocusTime += actualFocusTime;
        
        console.log(`? Focus completed: ${actualFocusTime}s = ${focusMinutesCompleted} coins`);
      } else if (prev.phase === 'focus' && isSkipped) {
        // If skipped, only count the time actually elapsed before skipping
        // but don't award any coins for skipped focus time
        completedFocusTime += prev.timeElapsed;
        coinsToAdd = 0; // No coins for skipped time
        
        console.log(`?? Focus skipped: ${prev.timeElapsed}s counted, 0 coins awarded`);
      }

      // ? PHASE TRANSITION LOGIC
      // Determine what the next phase should be based on current phase
      if (prev.phase === 'prep') {
        // After prep, always go to focus
        nextPhase = 'focus';
        console.log('??¡ð? Prep complete ¡÷ Focus');
      } else if (prev.phase === 'focus') {
        // After focus, go to break (if break duration > 0) or next loop
        if (settings.breakDuration > 0) {
          nextPhase = 'break';
          console.log(`? Focus complete ¡÷ Break (Loop ${prev.currentLoop})`);
        } else {
          // No break time, move directly to next loop or complete
          nextLoop++;
          if (nextLoop <= settings.loops) {
            nextPhase = 'focus';
            console.log(`? Focus complete ¡÷ Next Focus (Loop ${nextLoop})`);
          } else {
            nextPhase = 'completed';
            console.log('? Focus complete ¡÷ Session Complete!');
          }
        }
      } else if (prev.phase === 'break') {
        // After break, move to next loop or complete session
        nextLoop++;
        if (nextLoop <= settings.loops) {
          nextPhase = 'focus';
          console.log(`? Break complete ¡÷ Focus (Loop ${nextLoop})`);
        } else {
          nextPhase = 'completed';
          console.log('? Break complete ¡÷ Session Complete!');
        }
      } else {
        // Fallback case
        nextPhase = 'completed';
      }

      const phaseDuration = getCurrentPhaseDuration(nextPhase);

      return {
        ...prev,
        phase: nextPhase,
        state: nextPhase === 'completed' ? 'completed' : prev.state,
        currentLoop: nextLoop,
        timeElapsed: 0,
        timeRemaining: phaseDuration,
        totalSessionTime: phaseDuration,
        coinsEarned: prev.coinsEarned + coinsToAdd,
        completedFocusTime,
      };
    });
  }, [settings, getCurrentPhaseDuration]);

  // Timer tick function - called every second when timer is running
  const tick = useCallback(() => {
    setSession(prev => {
      // Don't tick if timer is not running or session is completed
      if (prev.state !== 'running' || prev.phase === 'completed') {
        return prev;
      }

      // Increment elapsed time and decrement remaining time
      const newTimeElapsed = prev.timeElapsed + 1;
      const newTimeRemaining = prev.timeRemaining - 1;

      // Check if current phase is complete (time remaining hits 0)
      if (newTimeRemaining <= 0) {
        // Phase completed, move to next phase
        // Use setTimeout to avoid state update during render
        setTimeout(moveToNextPhase, 0);
        return prev;
      }

      // Update timer state with new time values
      return {
        ...prev,
        timeElapsed: newTimeElapsed,
        timeRemaining: newTimeRemaining,
      };
    });
  }, [moveToNextPhase]);

  // Start timer
  const startTimer = useCallback(() => {
    setSession(prev => ({ ...prev, state: 'running' }));
  }, []);

  // Pause timer
  const pauseTimer = useCallback(() => {
    setSession(prev => ({ ...prev, state: 'paused' }));
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    setSession({
      phase: settings.hasPrep ? 'prep' : 'focus',
      state: 'idle',
      currentLoop: 1,
      totalLoops: settings.loops,
      timeElapsed: 0,
      timeRemaining: settings.hasPrep ? PREP_DURATION : settings.focusDuration,
      totalSessionTime: settings.hasPrep ? PREP_DURATION : settings.focusDuration,
      coinsEarned: 0,
      completedFocusTime: 0,
    });
  }, [settings]);

  // Skip current phase (no coins awarded for skipped focus time)
  const skipPhase = useCallback(() => {
    moveToNextPhase(true); // Pass true to indicate this is a skip
  }, [moveToNextPhase]);

  // ? TIMER INTERVAL MANAGEMENT
  // Set up timer interval that ticks every second when running
  useEffect(() => {
    if (session.state === 'running') {
      // Start the interval - tick function called every 1000ms (1 second)
      intervalRef.current = setInterval(tick, 1000);
      console.log('? Timer started - interval created');
    } else {
      // Stop the interval when paused, idle, or completed
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('?? Timer stopped - interval cleared');
      }
    }

    // Cleanup function - runs when effect dependencies change or component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('? Timer cleanup - interval cleared');
      }
    };
  }, [session.state, tick]); // Re-run when timer state or tick function changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    session,
    displayTime: getDisplayTime(),
    formattedTime: formatTime(getDisplayTime()),
    totalDuration: getTotalDuration(),
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
    formatTime,
  };
};
