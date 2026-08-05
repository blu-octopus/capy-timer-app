import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CapyMascot, type CapyMood } from '@/components/capy/CapyMascot';
import { Coin } from '@/components/capy/Coin';
import { CoinWallet } from '@/components/capy/CoinWallet';
import { Button } from '@/components/ui/Button';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { colors } from '@/src/theme/tokens';

// Temporary gallery — replaced by the Home/Timer screen next.
export default function HomeScreen() {
  const [mood, setMood] = useState<CapyMood>('idle');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <CoinWallet amount={78160} onPress={() => {}} />

      <CapyMascot size={206} mood={mood} />

      <SegmentedTabs
        options={[
          { value: 'idle', label: 'Idle' },
          { value: 'working', label: 'Working' },
          { value: 'paused', label: 'Paused' },
          { value: 'celebrating', label: 'Celebrate' },
        ]}
        value={mood}
        onChange={setMood}
        width={353}
      />

      <Text variant="mainTimerNumber">25:00</Text>

      <View style={styles.row}>
        <Coin size={24} />
        <Coin size={36} />
        <Coin size={48} />
      </View>

      <View style={styles.row}>
        <CapyMascot size={120} locked />
        <CapyMascot size={120} />
      </View>

      <Button label="Session Details" variant="outlined" onPress={() => {}} />
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
    gap: 16,
    alignItems: 'center',
  },
});
