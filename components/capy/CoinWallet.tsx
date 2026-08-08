import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/src/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Coin } from './Coin';

export interface CoinWalletProps {
  /** Numbers get thousands separators; pass a string to bypass formatting. */
  amount: number | string;
  onPress?: () => void;
}

const COIN_SIZE = 24;
const PILL_HEIGHT = 19;

export function CoinWallet({ amount, onPress }: CoinWalletProps) {
  const label = typeof amount === 'number' ? amount.toLocaleString('en-US') : amount;

  const content = (
    <View style={styles.wallet}>
      {/* The coin overlaps the pill's left edge rather than sitting beside it. */}
      <View style={styles.coin}>
        <Coin size={COIN_SIZE} />
      </View>
      <View style={styles.pill}>
        <Text style={styles.amount}>{label}</Text>
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} coins. Buy more.`}
      hitSlop={12}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wallet: {
    height: COIN_SIZE,
    paddingLeft: COIN_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coin: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  pill: {
    height: PILL_HEIGHT,
    minWidth: COIN_SIZE,
    paddingLeft: 16,
    paddingRight: 8,
    marginLeft: -12,
    borderWidth: 1,
    borderColor: colors.brown,
    borderRadius: 20,
    justifyContent: 'center',
  },
  amount: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.brown,
  },
});
