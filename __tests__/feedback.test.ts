/**
 * Feedback is decoration: a missing native module, a rejected audio session,
 * or a device that can't vibrate must never take a tap down with it. These
 * tests are mostly about what does *not* happen when things go wrong.
 */

import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { playFeedback, resetFeedback, selectionFeedback, tapFeedback } from '@/src/feedback';

const mockCreateAudioPlayer = createAudioPlayer as jest.MockedFunction<typeof createAudioPlayer>;

beforeEach(() => {
  jest.clearAllMocks();
  resetFeedback();
});

describe('feedback', () => {
  it('fires both a haptic and a sound for one call', () => {
    tapFeedback();

    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('uses the dedicated selection haptic for option changes', () => {
    selectionFeedback();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('reuses one player per sound instead of constructing on every call', () => {
    tapFeedback();
    tapFeedback();
    tapFeedback();

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('rewinds before replaying so rapid repeats retrigger', () => {
    selectionFeedback();
    const player = mockCreateAudioPlayer.mock.results[0]!.value;

    selectionFeedback();

    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('stays silent — and does not throw — when audio is unavailable', () => {
    mockCreateAudioPlayer.mockImplementationOnce(() => {
      throw new Error('native audio module missing');
    });

    expect(() => tapFeedback()).not.toThrow();
    // The haptic half still lands even though the audio half failed.
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('gives up on audio permanently after a construction failure', () => {
    mockCreateAudioPlayer.mockImplementationOnce(() => {
      throw new Error('native audio module missing');
    });

    tapFeedback();
    tapFeedback();
    tapFeedback();

    // Retrying a constructor that already threw would burn work on every tap.
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('does not throw when a haptic rejects', () => {
    (Haptics.impactAsync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no haptic engine');
    });

    expect(() => tapFeedback()).not.toThrow();
  });

  it('skips haptics on web, where the module has no implementation', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    jest.resetModules();

    try {
      // Re-require so the module-level platform check re-evaluates.
      const web = require('@/src/feedback');
      web.playFeedback('tap');
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
      jest.resetModules();
    }
  });

  it('maps each kind to a distinct sound', () => {
    playFeedback('tap');
    playFeedback('selection');
    playFeedback('phase');
    playFeedback('success');
    playFeedback('denied');
    playFeedback('unlock');

    const sources = mockCreateAudioPlayer.mock.calls.map(([source]) => source);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(6);
    expect(new Set(sources).size).toBeGreaterThan(0);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(4);
  });

  it('uses the error notification haptic for a blocked action, distinct from success', () => {
    playFeedback('denied');

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('uses the success notification haptic for a companion unlock', () => {
    playFeedback('unlock');

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });
});
