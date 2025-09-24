/**
 * ? Capybara Timer - Unit Tests for useTimer Hook
 * 
 * Tests all timer functionality including:
 * - Basic timer operations (start/pause/reset)
 * - Phase transitions (prep -> focus -> break -> complete)
 * - Coin calculation logic
 * - Skip functionality
 * - Loop handling
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { TimerSettings, useTimer } from '../hooks/useTimer';

// Mock timers for controlled testing
jest.useFakeTimers();

describe('useTimer Hook', () => {
  const defaultSettings: TimerSettings = {
    focusDuration: 60, // 1 minute
    breakDuration: 30, // 30 seconds
    loops: 2,
    hasPrep: false,
    countUp: false,
  };

  const settingsWithPrep: TimerSettings = {
    ...defaultSettings,
    hasPrep: true,
  };

  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      expect(result.current.session.phase).toBe('focus');
      expect(result.current.session.state).toBe('idle');
      expect(result.current.session.currentLoop).toBe(1);
      expect(result.current.session.currentLoop).toBe(1);
      expect(result.current.session.timeRemaining).toBe(60);
      expect(result.current.session.coinsEarned).toBe(0);
      expect(result.current.session.completedFocusTime).toBe(0);
    });

    it('should initialize with prep phase when hasPrep is true', () => {
      const { result } = renderHook(() => useTimer(settingsWithPrep));
      
      expect(result.current.session.phase).toBe('prep');
      expect(result.current.session.timeRemaining).toBe(300); // 5 minutes
    });
  });

  describe('Timer Controls', () => {
    it('should start timer correctly', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
      });
      
      expect(result.current.session.state).toBe('running');
    });

    it('should pause timer correctly', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        result.current.pauseTimer();
      });
      
      expect(result.current.session.state).toBe('paused');
    });

    it('should reset timer correctly', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(5000); // 5 seconds
        result.current.resetTimer();
      });
      
      expect(result.current.session.state).toBe('idle');
      expect(result.current.session.timeElapsed).toBe(0);
      expect(result.current.session.timeRemaining).toBe(60);
      expect(result.current.session.currentLoop).toBe(1);
      expect(result.current.session.coinsEarned).toBe(0);
    });
  });

  describe('Timer Countdown', () => {
    it('should countdown correctly when running', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(5000); // 5 seconds
      });
      
      expect(result.current.session.timeElapsed).toBe(5);
      expect(result.current.session.timeRemaining).toBe(55);
    });

    it('should not countdown when paused', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(3000); // 3 seconds
        result.current.pauseTimer();
        jest.advanceTimersByTime(5000); // 5 more seconds
      });
      
      expect(result.current.session.timeElapsed).toBe(3); // Should stay at 3
      expect(result.current.session.timeRemaining).toBe(57);
    });
  });

  describe('Phase Transitions', () => {
    it('should transition from focus to break', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(60000); // Complete focus phase
      });
      
      expect(result.current.session.phase).toBe('break');
      expect(result.current.session.timeRemaining).toBe(30);
      expect(result.current.session.currentLoop).toBe(1);
    });

    it('should transition from break to next focus loop', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(60000); // Complete focus
        jest.advanceTimersByTime(30000); // Complete break
      });
      
      expect(result.current.session.phase).toBe('focus');
      expect(result.current.session.currentLoop).toBe(2);
      expect(result.current.session.timeRemaining).toBe(60);
    });

    it('should complete after all loops', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        // Complete loop 1
        jest.advanceTimersByTime(60000); // Focus
        jest.advanceTimersByTime(30000); // Break
        // Complete loop 2
        jest.advanceTimersByTime(60000); // Focus
      });
      
      expect(result.current.session.phase).toBe('completed');
      expect(result.current.session.state).toBe('completed');
    });

    it('should handle prep phase correctly', () => {
      const { result } = renderHook(() => useTimer(settingsWithPrep));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(300000); // Complete prep (5 minutes)
      });
      
      expect(result.current.session.phase).toBe('focus');
      expect(result.current.session.timeRemaining).toBe(60);
    });
  });

  describe('Coin System', () => {
    it('should award coins for completed focus time', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(60000); // Complete 1 minute focus
      });
      
      expect(result.current.session.coinsEarned).toBe(1); // 1 coin per minute
      expect(result.current.session.completedFocusTime).toBe(60);
    });

    it('should award partial coins for partial focus time', () => {
      const longFocusSettings: TimerSettings = {
        ...defaultSettings,
        focusDuration: 150, // 2.5 minutes
      };
      
      const { result } = renderHook(() => useTimer(longFocusSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(150000); // Complete 2.5 minutes
      });
      
      expect(result.current.session.coinsEarned).toBe(2); // Floor of 2.5 = 2 coins
      expect(result.current.session.completedFocusTime).toBe(150);
    });

    it('should not award coins for prep or break phases', () => {
      const { result } = renderHook(() => useTimer(settingsWithPrep));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(300000); // Complete prep
        jest.advanceTimersByTime(60000); // Complete focus
        jest.advanceTimersByTime(30000); // Complete break
      });
      
      // Only focus time should award coins
      expect(result.current.session.coinsEarned).toBe(1);
      expect(result.current.session.completedFocusTime).toBe(60);
    });

    it('should accumulate coins across multiple focus sessions', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        // Complete full session (2 loops)
        jest.advanceTimersByTime(60000); // Focus 1
        jest.advanceTimersByTime(30000); // Break 1
        jest.advanceTimersByTime(60000); // Focus 2
      });
      
      expect(result.current.session.coinsEarned).toBe(2); // 2 completed focus sessions
      expect(result.current.session.completedFocusTime).toBe(120);
    });
  });

  describe('Skip Functionality', () => {
    it('should skip phase without awarding coins', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(30000); // 30 seconds into focus
        result.current.skipPhase();
      });
      
      expect(result.current.session.phase).toBe('break');
      expect(result.current.session.coinsEarned).toBe(0); // No coins for skipped focus
      expect(result.current.session.completedFocusTime).toBe(30); // But time is tracked
    });

    it('should skip break phase correctly', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(60000); // Complete focus
        jest.advanceTimersByTime(15000); // 15 seconds into break
        result.current.skipPhase();
      });
      
      expect(result.current.session.phase).toBe('focus');
      expect(result.current.session.currentLoop).toBe(2);
      expect(result.current.session.coinsEarned).toBe(1); // Still have coin from completed focus
    });

    it('should handle skipping with no break duration', () => {
      const noBreakSettings: TimerSettings = {
        ...defaultSettings,
        breakDuration: 0,
      };
      
      const { result } = renderHook(() => useTimer(noBreakSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(60000); // Complete focus
      });
      
      // Should go directly to next loop since break is 0
      expect(result.current.session.phase).toBe('focus');
      expect(result.current.session.currentLoop).toBe(2);
    });
  });

  describe('Time Display', () => {
    it('should format time correctly', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      expect(result.current.formatTime(0)).toBe('00:00');
      expect(result.current.formatTime(30)).toBe('00:30');
      expect(result.current.formatTime(60)).toBe('01:00');
      expect(result.current.formatTime(125)).toBe('02:05');
      expect(result.current.formatTime(3661)).toBe('61:01'); // Over 1 hour
    });

    it('should display formatted time correctly', () => {
      const { result } = renderHook(() => useTimer(defaultSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(15000); // 15 seconds
      });
      
      expect(result.current.formattedTime).toBe('00:45'); // 60 - 15 = 45 seconds remaining
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short durations', () => {
      const shortSettings: TimerSettings = {
        focusDuration: 1,
        breakDuration: 1,
        loops: 1,
        hasPrep: false,
        countUp: false,
      };
      
      const { result } = renderHook(() => useTimer(shortSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(1000); // Complete 1 second focus
        jest.advanceTimersByTime(1000); // Complete 1 second break
      });
      
      expect(result.current.session.phase).toBe('completed');
      expect(result.current.session.coinsEarned).toBe(0); // Less than 1 minute
    });

    it('should handle single loop correctly', () => {
      const singleLoopSettings: TimerSettings = {
        ...defaultSettings,
        loops: 1,
      };
      
      const { result } = renderHook(() => useTimer(singleLoopSettings));
      
      act(() => {
        result.current.startTimer();
        jest.advanceTimersByTime(60000); // Complete focus
        jest.advanceTimersByTime(30000); // Complete break
      });
      
      expect(result.current.session.phase).toBe('completed');
      expect(result.current.session.currentLoop).toBe(1);
    });
  });
});
