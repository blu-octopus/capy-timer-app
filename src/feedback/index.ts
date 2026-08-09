import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Every interaction's tactile + audible response, behind one call so screens
 * never have to coordinate two systems (and can't drift out of sync).
 *
 * Nothing here is allowed to throw or block: feedback is decoration, and a
 * missing native module or a rejected audio session must never take a tap
 * with it. Both halves degrade independently — web gets sound but no haptics,
 * a device with the ringer off gets haptics but no sound.
 */
export type FeedbackKind = 'tap' | 'selection' | 'phase' | 'success' | 'denied' | 'unlock';

const SOUNDS: Record<FeedbackKind, number> = {
  tap: require('../../assets/sfx/tap.wav'),
  selection: require('../../assets/sfx/tick.wav'),
  phase: require('../../assets/sfx/phase.wav'),
  success: require('../../assets/sfx/complete.wav'),
  denied: require('../../assets/sfx/denied.wav'),
  unlock: require('../../assets/sfx/unlock.wav'),
};

const VOLUME: Record<FeedbackKind, number> = {
  tap: 0.35,
  selection: 0.25,
  phase: 0.5,
  success: 0.6,
  denied: 0.4,
  unlock: 0.55,
};

/** Haptics has no web implementation, so skip the call rather than catch a throw per tap. */
const HAPTICS_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

const players = new Map<FeedbackKind, AudioPlayer>();
let audioEnabled = true;
let audioModeConfigured = false;

/**
 * Plays alongside other audio and stays silent when the iOS ringer switch is
 * off — a UI blip should never duck the user's music or fire during silent mode.
 */
function configureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  void setAudioModeAsync({
    playsInSilentMode: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'mixWithOthers',
  }).catch(() => {
    // A rejected audio session just means less polish, not a broken app.
  });
}

function playerFor(kind: FeedbackKind): AudioPlayer | null {
  const existing = players.get(kind);
  if (existing) return existing;

  try {
    const player = createAudioPlayer(SOUNDS[kind]);
    player.volume = VOLUME[kind];
    players.set(kind, player);
    return player;
  } catch {
    // No native audio module (Expo Go quirks, unsupported platform): go quiet
    // permanently rather than retrying a failing constructor on every tap.
    audioEnabled = false;
    return null;
  }
}

function playSound(kind: FeedbackKind) {
  if (!audioEnabled) return;
  configureAudioMode();

  const player = playerFor(kind);
  if (!player) return;

  try {
    // Rewind first so rapid repeats (a fast scroll through wheel detents)
    // retrigger instead of being swallowed while the previous play finishes.
    player.seekTo(0);
    player.play();
  } catch {
    // Ignore: a dropped blip is not worth surfacing.
  }
}

function playHaptic(kind: FeedbackKind) {
  if (!HAPTICS_SUPPORTED) return;

  try {
    switch (kind) {
      case 'tap':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'selection':
        // Purpose-built for exactly this: the detent tick of a picker.
        void Haptics.selectionAsync();
        break;
      case 'phase':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'success':
      case 'unlock':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'denied':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Ignore: haptics are unavailable on some devices and in some contexts.
  }
}

export function playFeedback(kind: FeedbackKind) {
  playHaptic(kind);
  playSound(kind);
}

/** A button, icon button, or any other ordinary press. */
export const tapFeedback = () => playFeedback('tap');
/** Moving between options — wheel detents, tabs, carousel pages. */
export const selectionFeedback = () => playFeedback('selection');
/** Crossing a phase boundary mid-run (focus->break and back). */
export const phaseFeedback = () => playFeedback('phase');
/** Finishing a whole session. */
export const successFeedback = () => playFeedback('success');
/** A blocked action — e.g. trying to unlock a companion without enough coins. */
export const deniedFeedback = () => playFeedback('denied');
/** Successfully spending coins to unlock a companion. */
export const unlockFeedback = () => playFeedback('unlock');

/** Releases cached players. Exported for tests; the app holds these for its lifetime. */
export function resetFeedback() {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      // Already torn down.
    }
  }
  players.clear();
  audioEnabled = true;
  audioModeConfigured = false;
}
