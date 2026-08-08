import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CoinInnerIcon } from './icons/CoinInnerIcon';
import { CoinRingIcon } from './icons/CoinRingIcon';
import { CoinSymbolIcon } from './icons/CoinSymbolIcon';

export interface CoinProps {
  size?: number;
}

/** Nominal size the three layers were exported against. */
const NOMINAL = 36;
const RING = 39;
const INNER = 30;
const SYMBOL_W = 11;
const SYMBOL_H = 19;

/**
 * Three separately exported layers, each with its own asymmetric bleed, so
 * they are centered individually rather than stacked.
 */
export function Coin({ size = NOMINAL }: CoinProps) {
  const k = size / NOMINAL;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Layer width={RING * k} height={RING * k}>
        <CoinRingIcon width={RING * k} height={RING * k} />
      </Layer>
      <Layer width={INNER * k} height={INNER * k}>
        <CoinInnerIcon width={INNER * k} height={INNER * k} />
      </Layer>
      <Layer width={SYMBOL_W * k} height={SYMBOL_H * k}>
        <CoinSymbolIcon width={SYMBOL_W * k} height={SYMBOL_H * k} />
      </Layer>
    </View>
  );
}

function Layer({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.layer,
        { width, height, marginLeft: -width / 2, marginTop: -height / 2 },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
});
