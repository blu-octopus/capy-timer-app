import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Coin } from '@/components/capy/Coin';
import { RibbonIcon } from '@/components/capy/icons/RibbonIcon';
import { colors, seeds } from '@/src/theme/tokens';
import { Text } from './Text';
import { useMeasuredSize, WobbleBorder } from './WobbleBorder';

export interface InAppPurchaseCardProps {
  coins: number;
  priceString: string;
  featured?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const FEATURED_COIN_POSITIONS = [
  { left: 15.95, top: 32.25 },
  { left: 36.56, top: 33.25 },
  { left: 26.8, top: 15.0 },
];

export function InAppPurchaseCard({
  coins,
  priceString,
  featured,
  onPress,
  disabled,
}: InAppPurchaseCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${coins.toLocaleString('en-US')} coins for ${priceString}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [(pressed || disabled) && styles.dimmed]}
    >
      {featured ? <Featured coins={coins} priceString={priceString} /> : <Plain coins={coins} priceString={priceString} />}
    </Pressable>
  );
}

function Plain({ coins, priceString }: { coins: number; priceString: string }) {
  return (
    <View style={styles.plainCard}>
      <View style={styles.plainCoinRow}>
        <View style={[styles.plainCoin, { transform: [{ translateX: 9 }], zIndex: 1 }]}>
          <Coin size={30} />
        </View>
        <View style={[styles.plainCoin, { transform: [{ translateX: -9 }], zIndex: 2 }]}>
          <Coin size={30} />
        </View>
      </View>
      <Text variant="h1" style={styles.plainAmount}>
        {coins.toLocaleString('en-US')}
      </Text>
      <Text variant="caption">{priceString}</Text>
    </View>
  );
}

function Featured({ coins, priceString }: { coins: number; priceString: string }) {
  const { size, onLayout } = useMeasuredSize();

  return (
    <View style={styles.featuredCard} onLayout={onLayout}>
      <View style={styles.ribbonWrap}>
        <RibbonIcon width={63.04} height={37.96} style={styles.ribbonIcon} />
        <Text style={styles.ribbonText}>Value!</Text>
      </View>

      <View style={styles.featuredCoins}>
        {FEATURED_COIN_POSITIONS.map((pos, i) => (
          <View key={i} style={[styles.featuredCoin, { left: pos.left, top: pos.top }]}>
            <Coin size={37.5} />
          </View>
        ))}
      </View>

      <Text variant="h1" style={styles.featuredAmount}>
        {coins.toLocaleString('en-US')}
      </Text>
      <Text variant="caption" style={styles.featuredPrice}>
        {priceString}
      </Text>

      {/* Painted last so it sits above the ribbon and coins. */}
      <WobbleBorder width={size.width} height={size.height} radius={10} seed={seeds.iapFeatured} />
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: {
    opacity: 0.6,
  },
  plainCard: {
    width: 88,
    alignItems: 'center',
    paddingTop: 17,
    paddingBottom: 15,
    gap: 6,
  },
  plainCoinRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainCoin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainAmount: {
    fontWeight: '100',
    fontSize: 20,
    color: colors.brown,
  },
  featuredCard: {
    width: 88,
    height: 119,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  ribbonWrap: {
    position: 'absolute',
    left: 30.89,
    top: -10.14,
    width: 63.04,
    height: 37.96,
    transform: [{ rotate: '20deg' }],
  },
  ribbonIcon: {
    position: 'absolute',
  },
  ribbonText: {
    position: 'absolute',
    left: 63.9,
    top: 10.34,
    transform: [{ translateX: -30 }, { translateY: -5 }, { rotate: '24deg' }],
    fontStyle: 'italic',
    fontSize: 11,
    lineHeight: 11,
    color: colors.white,
  },
  featuredCoins: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 70,
  },
  featuredCoin: {
    position: 'absolute',
  },
  featuredAmount: {
    position: 'absolute',
    left: '50%',
    top: 70,
    transform: [{ translateX: -22 }],
    fontSize: 18,
    color: colors.brown,
  },
  featuredPrice: {
    position: 'absolute',
    left: '50%',
    top: 100,
    transform: [{ translateX: -18 }],
  },
});
