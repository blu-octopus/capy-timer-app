import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CapyMascot, skinForCompanionId, type CapyMood } from '@/components/capy/CapyMascot';
import { Coin } from '@/components/capy/Coin';
import { CoinWallet } from '@/components/capy/CoinWallet';
import { PauseIcon } from '@/components/capy/icons/PauseIcon';
import { PlayIcon } from '@/components/capy/icons/PlayIcon';
import { RestartIcon } from '@/components/capy/icons/RestartIcon';
import { SkipIcon } from '@/components/capy/icons/SkipIcon';
import { StatsIcon } from '@/components/capy/icons/StatsIcon';
import { Button } from '@/components/ui/Button';
import { swatchColor } from '@/components/ui/ColorPicker';
import { DialogueBubble } from '@/components/ui/DialogueBubble';
import { IconButton } from '@/components/ui/IconButton';
import { Sparks } from '@/components/ui/Sparks';
import { Text } from '@/components/ui/Text';
import { TimerClock } from '@/components/ui/TimerClock';
import { useRunTicker } from '@/hooks/useRunTicker';
import { useSessionNotifications } from '@/hooks/useSessionNotifications';
import { useAppStore } from '@/src/store';
import { resolvePosition } from '@/src/store/types';
import { MESSAGE_INTERVAL_MS, messageFor } from '@/src/theme/messages';
import { colors } from '@/src/theme/tokens';

const PHASE_LABEL = {
  prep: 'Prep Time',
  focus: 'Focus Time',
  break: 'Break Time',
} as const;

export default function TimerScreen() {
  useRunTicker();
  useSessionNotifications();
  const router = useRouter();

  const status = useAppStore((s) => s.status);
  const phase = useAppStore((s) => s.phase);
  const elapsedMs = useAppStore((s) => s.elapsedMs);
  const schedule = useAppStore((s) => s.schedule);
  const coinsAwarded = useAppStore((s) => s.coinsAwarded);
  const plan = useAppStore((s) => s.plan);
  const coins = useAppStore((s) => s.wallet.coins);
  const categories = useAppStore((s) => s.categories);

  const startRun = useAppStore((s) => s.startRun);
  const pause = useAppStore((s) => s.pause);
  const resume = useAppStore((s) => s.resume);
  const skipPhase = useAppStore((s) => s.skipPhase);
  const abandonRun = useAppStore((s) => s.abandonRun);
  const reset = useAppStore((s) => s.reset);

  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isEnded = status === 'ended';

  const position = useMemo(
    () => (schedule.length ? resolvePosition(schedule, elapsedMs) : null),
    [schedule, elapsedMs],
  );

  // Idle shows the planned focus length; a live run shows the current phase.
  const phaseDurationMs = position?.segment?.durationMs ?? plan.focusMin * 60 * 1000;
  const msInPhase = position?.msInPhase ?? 0;
  const remainingSeconds = Math.max(0, Math.ceil((phaseDurationMs - msInPhase) / 1000));
  const elapsedSeconds = Math.floor(msInPhase / 1000);
  const displaySeconds = plan.countDirection === 'up' ? elapsedSeconds : remainingSeconds;

  const mood: CapyMood = isEnded
    ? 'celebrating'
    : isPaused
      ? 'paused'
      : isRunning
        ? 'working'
        : 'idle';

  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setMessageIndex((i) => i + 1), MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  const category = categories.find((c) => c.id === plan.categoryId);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          icon={StatsIcon}
          size={22}
          accessibilityLabel="Statistics"
          onPress={() => router.push('/stats')}
        />
        <CoinWallet amount={coins} onPress={() => router.push('/iap')} />
      </View>

      <View style={styles.body}>
        {isEnded ? (
          <CompletionState coins={coinsAwarded} companionId={plan.companionId} />
        ) : (
          <>
            <View style={styles.bubbleSlot}>
              {(isRunning || isPaused) && (
                <DialogueBubble>
                  {isPaused ? '...' : messageFor(phase, messageIndex)}
                </DialogueBubble>
              )}
            </View>

            <CapyMascot size={190} mood={mood} skin={skinForCompanionId(plan.companionId)} />

            <View style={styles.clockSlot}>
              {!isIdle && <Text variant="caption">{PHASE_LABEL[phase]}</Text>}
              <TimerClock seconds={displaySeconds} direction={plan.countDirection} />
              {(isRunning || isPaused) && plan.loops > 1 && (
                <Text variant="caption">
                  loop {(position?.segment?.loopIndex ?? 0) + 1} of {plan.loops}
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.controls}>
        {isIdle && (
          <IconButton
            icon={PlayIcon}
            size={36}
            accessibilityLabel="Start session"
            onPress={() => startRun()}
          />
        )}

        {isRunning && (
          <IconButton
            icon={PauseIcon}
            size={36}
            accessibilityLabel="Pause"
            onPress={() => pause()}
          />
        )}

        {isPaused && (
          <View style={styles.controlRow}>
            <IconButton
              icon={RestartIcon}
              size={28}
              accessibilityLabel="Restart session"
              onPress={() => abandonRun()}
            />
            <IconButton
              icon={PlayIcon}
              size={36}
              accessibilityLabel="Resume"
              onPress={() => resume()}
            />
            <IconButton
              icon={SkipIcon}
              size={28}
              accessibilityLabel="Skip phase"
              onPress={() => skipPhase()}
            />
          </View>
        )}

        {isEnded && (
          <View style={styles.controlRow}>
            <IconButton
              icon={RestartIcon}
              size={28}
              accessibilityLabel="Start another session"
              onPress={reset}
            />
            <IconButton
              icon={StatsIcon}
              size={28}
              accessibilityLabel="Statistics"
              onPress={() => router.push('/stats')}
            />
          </View>
        )}

        {isPaused && <Text variant="caption">tap to resume</Text>}
      </View>

      <View style={styles.footer}>
        {isIdle ? (
          <Button
            label="Session Details"
            variant="outlined"
            onPress={() => router.push('/session-setup')}
          />
        ) : (
          category && (
            <View style={styles.categoryPill}>
              <View style={[styles.categoryDot, { backgroundColor: swatchColor(category.color) }]} />
              <Text variant="caption">{category.name}</Text>
            </View>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

function CompletionState({ coins, companionId }: { coins: number; companionId: string }) {
  return (
    <>
      <View style={styles.awardSlot}>
        {coins > 0 && (
          <View style={styles.award}>
            <Coin size={22} />
            <Text variant="h1" style={styles.awardText}>
              +{coins}
            </Text>
            <Sparks />
          </View>
        )}
      </View>

      <CapyMascot size={190} mood="celebrating" skin={skinForCompanionId(companionId)} />

      <View style={styles.clockSlot}>
        <Text variant="h1" style={styles.congrats}>
          You did it!
        </Text>
        <Text variant="body">start another session?</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Reserved so the mascot doesn't jump when the bubble appears.
  bubbleSlot: {
    minHeight: 64,
    justifyContent: 'flex-end',
  },
  awardSlot: {
    minHeight: 64,
    justifyContent: 'flex-end',
  },
  award: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  awardText: {
    fontSize: 20,
  },
  clockSlot: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  congrats: {
    fontSize: 32,
  },
  controls: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    minHeight: 84,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.buttonPrimary,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
