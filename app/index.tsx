import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CapyMascot } from '@/components/capy/CapyMascot';
import { CoinWallet } from '@/components/capy/CoinWallet';
import { Button } from '@/components/ui/Button';
import { ColorPicker, type SwatchValue } from '@/components/ui/ColorPicker';
import { DailyStreaks } from '@/components/ui/DailyStreaks';
import { DialogueBubble } from '@/components/ui/DialogueBubble';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { TimerClock } from '@/components/ui/TimerClock';
import { colors } from '@/src/theme/tokens';

// Temporary gallery — replaced by the real screens next.
export default function HomeScreen() {
  const [seconds, setSeconds] = useState(1500);
  const [color, setColor] = useState<SwatchValue>('green');
  const [name, setName] = useState('study');
  const [rows, setRows] = useState([
    { label: 'Study', checked: [true, false, false, false, false] },
    { label: 'Poop', checked: [true, true, false, false, false] },
    { label: 'Meditate', checked: [true, false, true, true, false] },
  ]);

  // Live countdown so the odometer digits can be seen rolling.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 3600)), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <CoinWallet amount={200} onPress={() => {}} />

      <DialogueBubble>Don&apos;t give up!</DialogueBubble>
      <CapyMascot size={160} mood="working" />

      <TimerClock seconds={seconds} />
      <TimerClock seconds={600} variant="secondary" />

      <Field label="Name" value={name} onChangeText={setName} placeholder="study" />
      <ColorPicker value={color} onChange={setColor} />

      <View style={styles.streaks}>
        <DailyStreaks
          rows={rows}
          onToggle={(rowIndex, dayIndex, checked) =>
            setRows((prev) =>
              prev.map((row, i) =>
                i === rowIndex
                  ? { ...row, checked: row.checked.map((c, d) => (d === dayIndex ? checked : c)) }
                  : row,
              ),
            )
          }
        />
      </View>

      <Text variant="caption">tail placements</Text>
      <View style={styles.row}>
        <DialogueBubble placement="top">top</DialogueBubble>
        <DialogueBubble placement="left">left</DialogueBubble>
        <DialogueBubble showTail={false}>no tail</DialogueBubble>
      </View>

      <Button label="Session Details" variant="outlined" onPress={() => {}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 60,
    gap: 24,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  streaks: {
    width: 300,
  },
});
