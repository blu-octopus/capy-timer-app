import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { colors } from '@/src/theme/tokens';
import { CapyMascotHeadIcon } from './icons/CapyMascotHeadIcon';

export interface EggCapyProps {
  size?: number;
}

const NATURAL_SIZE = 130;
const EGG_STROKE = colors.brown;
const EGG_FILL = '#FFF8EF';
const GLOW = colors.yellowSecondary;

/**
 * Egg Capy — the first unlockable companion beyond the default. capy-ui has
 * no matching export, so this pairs the ported head-only mascot with a
 * hand-drawn egg shell built directly as an SVG path, rather than routing
 * through the sketch engine (which is shaped specifically for rounded
 * rectangles, not ovoids).
 */
export function EggCapy({ size = NATURAL_SIZE }: EggCapyProps) {
  const scale = size / NATURAL_SIZE;
  const headWidth = 78 * scale;
  const headHeight = (headWidth * 110.75) / 107.98;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 130 130" style={StyleSheet.absoluteFill}>
        <Ellipse cx={65} cy={68} rx={58} ry={54} fill={GLOW} opacity={0.35} />
        <Path
          d="M65 10
             C 92 10 112 44 112 78
             C 112 106 91 120 65 120
             C 39 120 18 106 18 78
             C 18 44 38 10 65 10
             Z"
          fill={EGG_FILL}
          stroke={EGG_STROKE}
          strokeWidth={3}
        />
      </Svg>

      <View style={[styles.headSlot, { width: headWidth, height: headHeight, top: size * 0.16 }]}>
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
