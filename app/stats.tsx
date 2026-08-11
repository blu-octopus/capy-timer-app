import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinWallet } from '@/components/capy/CoinWallet';
import { BackIcon } from '@/components/capy/icons/BackIcon';
import { BarChart } from '@/components/ui/BarChart';
import { DailyStreaks } from '@/components/ui/DailyStreaks';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
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
import { formatRangeLabel, lastNDaysRange } from '@/src/utils/calendar';

const MIN = 60 * 1000;

export default function StatsScreen() {
  const router = useRouter();
  const coins = useAppStore((s) => s.wallet.coins);
  const categories = useAppStore((s) => s.categories);

  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);
  const [customRange, setCustomRange] = useState(() => lastNDaysRange(7, Date.now()));
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

  const range = useMemo(
    () => timeframeRange(timeframe, Date.now(), customRange),
    [timeframe, customRange],
  );
  // The streak grid always shows the current week, whatever tab is active.
  const weekRange = useMemo(() => timeframeRange('week', Date.now()), []);

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

  useEffect(() => {
    getSessionsInRange(weekRange)
      .then(setWeekSessions)
      .catch(() => setWeekSessions([]));
  }, [weekRange]);

  const summary = useMemo(() => summarize(sessions), [sessions]);
  const focus = toHoursMinutes(summary.focusMs);
  const longest = toHoursMinutes(summary.longestMs);
  const average = toHoursMinutes(summary.averageMs);

  const buckets = useMemo(() => hourBuckets(sessions), [sessions]);
  const slices = useMemo(() => focusByCategory(sessions, categories), [sessions, categories]);
  const streaks = useMemo(
    () => streakMatrix(weekSessions, categories, weekRange),
    [weekSessions, categories, weekRange],
  );

  const topCategory = slices[0];
  // Completion rate within the selected window: finished runs over started.
  const completionPercent = summary.total === 0 ? 0 : (summary.completed / summary.total) * 100;

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
          onChange={(next) => {
            setTimeframe(next);
            if (next === 'custom') setRangePickerOpen(true);
          }}
        />

        {timeframe === 'custom' && (
          <Text
            variant="caption"
            style={styles.link}
            onPress={() => setRangePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Change date range"
          >
            {formatRangeLabel(customRange)}
          </Text>
        )}

        <Text variant="h2">Summary</Text>

        <View style={styles.cardGrid}>
          <TrendCard
            title="Sessions"
            stats={[{ value: `${summary.completed}/${summary.total}`, unit: 'completed' }]}
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
            stats={[{ value: topCategory?.label ?? '—' }]}
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
          <Text variant="h2">Coin shop</Text>
          <Text variant="body">Unlock companions with coins</Text>
          <Text variant="caption">
            Purchases buy in-app items. They are not donations.
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

      <DateRangePicker
        visible={rangePickerOpen}
        initialRange={customRange}
        onDismiss={() => setRangePickerOpen(false)}
        onConfirm={(next) => {
          setCustomRange(next);
          setRangePickerOpen(false);
        }}
      />
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
