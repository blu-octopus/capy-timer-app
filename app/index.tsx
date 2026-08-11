import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CapyMascot, skinForCompanionId, type CapyMood } from '@/components/capy/CapyMascot';
import { CompanionCarousel } from '@/components/capy/CompanionCarousel';
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
import { useRunFeedback } from '@/hooks/useRunFeedback';
import { useRunTicker } from '@/hooks/useRunTicker';
import { useSessionNotifications } from '@/hooks/useSessionNotifications';
import { deniedFeedback, tapFeedback, unlockFeedback } from '@/src/feedback';
import { useAppStore } from '@/src/store';
import { resolvePosition, totalPlanMinutes } from '@/src/store/types';
import { formatDuration } from '@/src/theme/formatDuration';
import { DIALOGUE_BUCKET_MS, dialogueFor } from '@/src/theme/messages';
import { colors } from '@/src/theme/tokens';

const PHASE_LABEL = {
  prep: 'Prep Time',
  focus: 'Focus Time',
  break: 'Break Time',
} as const;

export default function TimerScreen() {
  useRunTicker();
  useSessionNotifications();
  useRunFeedback();
  const router = useRouter();

  const status = useAppStore((s) => s.status);
  const phase = useAppStore((s) => s.phase);
  const elapsedMs = useAppStore((s) => s.elapsedMs);
  const schedule = useAppStore((s) => s.schedule);
  const coinsAwarded = useAppStore((s) => s.coinsAwarded);
  const coinsCapped = useAppStore((s) => s.coinsCapped);
  const plan = useAppStore((s) => s.plan);
  const coins = useAppStore((s) => s.wallet.coins);
  const categories = useAppStore((s) => s.categories);

  const companions = useAppStore((s) => s.companions);
  const startRun = useAppStore((s) => s.startRun);
  const pause = useAppStore((s) => s.pause);
  const resume = useAppStore((s) => s.resume);
  const skipPhase = useAppStore((s) => s.skipPhase);
  const abandonRun = useAppStore((s) => s.abandonRun);
  const reset = useAppStore((s) => s.reset);
  const updatePlan = useAppStore((s) => s.updatePlan);
  const unlockCompanion = useAppStore((s) => s.unlockCompanion);

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

  // A run's own elapsed time drives the bubble while it ticks; idle and
  // paused have no clock of their own, so they get a plain wall-clock counter
  // to rotate on. Bucketing either source keeps the bubble from re-rendering
  // on every one of the ticker's 250ms samples.
  const [idleBucket, setIdleBucket] = useState(0);
  useEffect(() => {
    if (isRunning) return;
    const id = setInterval(() => setIdleBucket((b) => b + 1), DIALOGUE_BUCKET_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  const dialogue = dialogueFor({
    status,
    phase,
    progress: phaseDurationMs > 0 ? Math.min(1, msInPhase / phaseDurationMs) : 0,
    msRemainingInPhase: Math.max(0, phaseDurationMs - msInPhase),
    loop: (position?.segment?.loopIndex ?? 0) + 1,
    totalLoops: plan.loops,
    bucket: isRunning ? Math.floor(elapsedMs / DIALOGUE_BUCKET_MS) : idleBucket,
  });

  const category = categories.find((c) => c.id === plan.categoryId);

  // What this whole sitting adds up to, named by whatever it was tagged as —
  // the per-phase caption down by the clock only ever describes the segment
  // running right now, so without this the total is invisible once you start.
  const sessionSummary = `${category?.name ?? 'focus'} session · ${formatDuration(totalPlanMinutes(plan))}`;

  // Browsing companions is an idle-only activity, so the carousel tracks its
  // own position and only writes the plan for buddies that are unlocked —
  // a locked one stays a preview you can look at but not adopt.
  const planIndex = Math.max(0, companions.findIndex((c) => c.id === plan.companionId));
  const [browseIndex, setBrowseIndex] = useState(planIndex);
  const browsing = companions[browseIndex] ?? companions[planIndex];

  const onBrowse = (next: number) => {
    setBrowseIndex(next);
    const companion = companions[next];
    if (companion?.unlocked) updatePlan({ companionId: companion.id });
  };

  const onUnlock = () => {
    if (!browsing) return;

    if (coins < browsing.priceCoins) {
      deniedFeedback();
      Alert.alert(
        'Not enough coins',
        `${browsing.name} costs ${browsing.priceCoins.toLocaleString('en-US')} coins. You have ${coins.toLocaleString('en-US')}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get coins', onPress: () => router.push('/iap') },
        ],
      );
      return;
    }

    Alert.alert(
      'Unlock buddy?',
      `Spend ${browsing.priceCoins.toLocaleString('en-US')} coins on ${browsing.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: () => {
            if (unlockCompanion(browsing.id)) {
              unlockFeedback();
              updatePlan({ companionId: browsing.id });
            }
          },
        },
      ],
    );
  };

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

      <View style={styles.sessionSummary}>
        <Text variant="caption">{sessionSummary}</Text>
      </View>

      <View style={styles.body}>
        {isEnded ? (
          <CompletionState
            coins={coinsAwarded}
            capped={coinsCapped}
            companionId={plan.companionId}
          />
        ) : (
          <>
            <View style={styles.bubbleSlot}>
              <DialogueBubble>{dialogue}</DialogueBubble>
            </View>

            {isIdle ? (
              <CompanionCarousel
                companions={companions}
                index={browseIndex}
                onIndexChange={onBrowse}
                size={190}
                showName={false}
              />
            ) : (
              <CapyMascot size={190} mood={mood} skin={skinForCompanionId(plan.companionId)} />
            )}

            <View style={styles.clockSlot}>
              {!isIdle && (
                <Text variant="caption">
                  {PHASE_LABEL[phase]} · {Math.round(phaseDurationMs / 60000)} min
                </Text>
              )}
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
          browsing && !browsing.unlocked ? (
            // The price replaces Session Details rather than sitting beside
            // it: there's nothing to set up for a buddy you don't own yet.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unlock ${browsing.name} for ${browsing.priceCoins} coins`}
              onPress={() => {
                tapFeedback();
                onUnlock();
              }}
              style={styles.unlockRow}
            >
              <Text variant="h1" style={styles.unlockText}>
                unlock for
              </Text>
              <Coin size={20} />
              <Text variant="h1" style={styles.unlockText}>
                {browsing.priceCoins.toLocaleString('en-US')}
              </Text>
            </Pressable>
          ) : (
            <Button
              label="Session Details"
              variant="outlined"
              onPress={() => router.push('/session-setup')}
            />
          )
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

function CompletionState({
  coins,
  capped,
  companionId,
}: {
  coins: number;
  capped: boolean;
  companionId: string;
}) {
  return (
    <>
      <View style={styles.awardSlot}>
        {coins > 0 && (
          <View style={styles.award}>
            <Coin size={22} />
            <Text variant="h1" style={styles.awardText}>
              +{coins}
            </Text>
            {/* Reaches out past the coin row to cover the mascot behind it —
                finishing a session is the one burst that should feel big. */}
            <Sparks scale={2.6} />
          </View>
        )}
      </View>

      <CapyMascot size={190} mood="celebrating" skin={skinForCompanionId(companionId)} />

      <View style={styles.clockSlot}>
        <Text variant="h1" style={styles.congrats}>
          You did it!
        </Text>
        <Text variant="body">
          {capped ? 'daily coin cap reached — extra focus still counts' : 'start another session?'}
        </Text>
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
  sessionSummary: {
    alignItems: 'center',
    paddingBottom: 4,
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
    // Clear of the mascot's ears: the slot bottom-aligns its contents, which
    // otherwise parks the coin right on top of the capybara's head.
    marginBottom: 24,
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
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  unlockText: {
    fontSize: 18,
  },
});
