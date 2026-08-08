import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FightingCapyHeadIcon } from './icons/FightingCapyHeadIcon';

export interface FightingCapyProps {
  size?: number;
}

const NATURAL_WIDTH = 74;
const NATURAL_HEIGHT = 76;

/**
 * Fighting Capy — head-only art the user supplied directly (a red
 * bandana/headband, matching the "Fighting!" name). Unlike Egg Capy there's
 * no shell composition to build; this just centers the provided art at the
 * same footprint the other companions use.
 */
export function FightingCapy({ size = NATURAL_HEIGHT }: FightingCapyProps) {
  const width = (size * NATURAL_WIDTH) / NATURAL_HEIGHT;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <FightingCapyHeadIcon width={width} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
