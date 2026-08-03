import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { colors, seeds } from '@/src/theme/tokens';
import { useMeasuredSize, WobbleBorder } from '@/components/ui/WobbleBorder';

// Temporary primitive gallery — replaced by the Home/Timer screen next.
export default function HomeScreen() {
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [prep, setPrep] = useState(false);
  const card = useMeasuredSize();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="h1">Primitives</Text>

      <Text variant="mainTimerNumber">25:00</Text>
      <Text variant="secondaryTimerNumber">05:00</Text>

      <View style={styles.row}>
        <Button label="filled" onPress={() => {}} />
        <Button label="outlined" variant="outlined" onPress={() => {}} />
        <Button label="ghost" variant="ghost" onPress={() => {}} />
      </View>

      <SegmentedTabs
        options={[
          { value: 'up', label: 'Count Up' },
          { value: 'down', label: 'Count Down' },
        ]}
        value={direction}
        onChange={setDirection}
        width={303}
      />

      <SegmentedTabs
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={timeframe}
        onChange={setTimeframe}
        width={353}
      />

      <View style={styles.row}>
        <Text variant="body">5-Min Prep Session</Text>
        <Toggle value={prep} onValueChange={setPrep} accessibilityLabel="Prep session" />
      </View>

      <View onLayout={card.onLayout} style={styles.card}>
        {card.size.width > 0 && (
          <WobbleBorder
            width={card.size.width}
            height={card.size.height}
            radius={10}
            seed={seeds.trendCard}
          />
        )}
        <Text variant="body">Wobble card</Text>
        <Text variant="stat">2/4</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 20,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  card: {
    width: 152,
    height: 84,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'space-between',
  },
});
