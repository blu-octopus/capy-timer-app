import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { colors } from '@/src/theme/tokens';
import { CapyMascotHeadIcon } from './icons/CapyMascotHeadIcon';

export interface ToiletCapyProps {
  size?: number;
}

const NATURAL_SIZE = 130;
const STROKE = colors.brown;
const PORCELAIN = '#FFF8EF';
const GLOW = colors.yellowSecondary;

/**
 * Toilet Capy — the priciest companion: a capy peeking up out of a
 * porcelain bowl. Same composition as EggCapy (hand-drawn SVG background
 * behind the ported head icon), just with a bowl-and-seat shape standing in
 * for the egg shell and the head slot pulled down so the chin tucks behind
 * the seat rim.
 */
export function ToiletCapy({ size = NATURAL_SIZE }: ToiletCapyProps) {
  const scale = size / NATURAL_SIZE;
  const headWidth = 76 * scale;
  const headHeight = (headWidth * 110.75) / 107.98;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 130 130" style={StyleSheet.absoluteFill}>
        <Ellipse cx={65} cy={68} rx={58} ry={54} fill={GLOW} opacity={0.35} />

        {/* Pedestal base. */}
        <Path
          d="M50 108 L45 122 L85 122 L80 108 Z"
          fill={PORCELAIN}
          stroke={STROKE}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {/* Bowl body. */}
        <Path
          d="M20 68
             C 20 98 40 114 65 114
             C 90 114 110 98 110 68
             Z"
          fill={PORCELAIN}
          stroke={STROKE}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {/* Seat lid ring, drawn as a flattened ellipse so the head can sit
            in front of the near edge and appear to rise out of the bowl. */}
        <Ellipse
          cx={65}
          cy={62}
          rx={46}
          ry={15}
          fill={PORCELAIN}
          stroke={STROKE}
          strokeWidth={3}
        />
        <Ellipse cx={65} cy={62} rx={30} ry={9} fill="#FFFDF9" stroke={STROKE} strokeWidth={2.5} />
      </Svg>

      <View style={[styles.headSlot, { width: headWidth, height: headHeight, top: size * 0.1 }]}>
        <CapyMascotHeadIcon width={headWidth} height={headHeight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headSlot: {
    position: 'absolute',
  },
});
