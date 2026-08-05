import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinWallet } from '@/components/capy/CoinWallet';
import { BackIcon } from '@/components/capy/icons/BackIcon';
import { BarChart } from '@/components/ui/BarChart';
import { DailyStreaks } from '@/components/ui/DailyStreaks';
import { IconButton } from '@/components/ui/IconButton';
import { PieChart } from '@/components/ui/PieChart';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { TrendCard } from '@/components/ui/TrendCard';
import { swatchColor } from '@/components/ui/ColorPicker';
import { getSessionsInRange } from '@/src/db/repository';
import type { Session } from '@/src/db/schema';
import {
  focusByCategory,
  hourBuckets,
  streakMatrix,
  summarize,
  timeframeRange,
  toHoursMinutes,
  type Timeframe,
} from '@/src/db/stats';
import { useAppStore } from '@/src/store';
import { colors } from '@/src/theme/tokens';

const MIN = 60 * 1000;

export default function StatsScreen() {
  const router = useRouter();
  const coins = useAppStore((s) => s.wallet.coins);
  const categories = useAppStore((s) => s.categories);
  const plan = useAppStore((s) => s.plan);

  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [sessions, setSessions] = useState<Session[]>([]);

  const range = useMemo(() => timeframeRange(timeframe, Date.now()), [timeframe]);

  const load = useCallback(async () => {
    try {
      setSessions(await getSessionsInRange(range));
    } catch {
      // No database (or none yet) simply means nothing to report.
      setSessions([]);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarize(sessions), [sessions]);
  const focus = toHoursMinutes(summary.focusMs);
  const longest = toHoursMinutes(summary.longestMs);
  const average = toHoursMinutes(summary.averageMs);

  const buckets = useMemo(() => hourBuckets(sessions), [sessions]);
  const slices = useMemo(() => focusByCategory(sessions, categories), [sessions, categories]);
  const streaks = useMemo(
    () => streakMatrix(sessions, categories, timeframeRange('week', Date.now())),
    [sessions, categories],
  );

  const topCategory = slices[0];
  const plannedSessions = Math.max(1, plan.loops);
  const completionPercent = Math.min(100, (summary.completed / plannedSessions) * 100);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon={BackIcon} size={22} accessibilityLabel="Back" onPress={router.back} />
        <CoinWallet amount={coins} onPress={() => router.push('/iap')} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedTabs
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'custom', label: 'Custom' },
          ]}
          value={timeframe}
          onChange={setTimeframe}
        />

        <Text variant="h2">Summary</Text>

        <View style={styles.cardGrid}>
          <TrendCard
            title="Sessions"
            stats={[{ value: `${summary.completed}/${plannedSessions}`, unit: 'completed' }]}
            indicator={<ProgressRing value={completionPercent} />}
          />
          <TrendCard
            title="Focus Time"
            stats={[
              { value: focus.hours, unit: 'hr' },
              { value: focus.minutes, unit: 'min' },
            ]}
          />
          <TrendCard
            title="Longest Session"
            stats={[
              { value: longest.hours, unit: 'hr' },
              { value: longest.minutes, unit: 'min' },
            ]}
          />
          <TrendCard
            title="Most Common Tag"
            stats={[{ value: slices.length, unit: topCategory?.label ?? '—' }]}
          />
        </View>

        <BarChart
          data={buckets.map((bucket) => ({
            value: Math.round(bucket.value / MIN),
            label: bucket.label,
          }))}
        />

        <PieChart
          data={slices.map((slice) => ({
            label: slice.label,
            value: slice.focusMs,
            color: swatchColor(slice.color),
          }))}
        />

        <View style={styles.section}>
          <DailyStreaks rows={streaks.map((row) => ({ label: row.label, checked: row.checked }))} />
        </View>

        <View style={styles.section}>
          <Text variant="h2">Support the Creator</Text>
          <Text variant="body">Buy me boba</Text>
          <Text variant="caption">
            In-app purchases help keep the capybaras fed.
          </Text>
          <View style={styles.supportRow}>
            <Text variant="body" style={styles.link} onPress={() => router.push('/iap')}>
              Open coin shop
            </Text>
          </View>
        </View>

        <View style={styles.averageNote}>
          <Text variant="caption">
            Average session {average.hours} hr {average.minutes} min
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 20,
    alignItems: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 325,
    gap: 8,
  },
  supportRow: {
    marginTop: 4,
  },
  link: {
    color: colors.brown,
    textDecorationLine: 'underline',
  },
  averageNote: {
    alignItems: 'center',
  },
});
