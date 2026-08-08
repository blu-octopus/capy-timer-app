import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import {
  generateWobbleRibbon,
  roundedRectBoundary,
  type BoundarySample,
  type Point,
} from '@/src/sketch';
import { colors, fonts, seeds, stroke } from '@/src/theme/tokens';
import { Text } from './Text';
import { useMeasuredSize } from './WobbleBorder';

export type BubblePlacement = 'top' | 'right' | 'bottom' | 'left';

export interface DialogueBubbleProps {
  children: React.ReactNode;
  /** Which edge the tail points from. */
  placement?: BubblePlacement;
  showTail?: boolean;
  paddingX?: number;
  paddingY?: number;
}

const CORNER_RADIUS = 24;
const STROKE_WIDTH = 1.5;
// Bubbles wobble noticeably tighter than cards and buttons.
const BUBBLE_FREQUENCY = stroke.frequency * 4.4;
const MIN_HEIGHT = 48;

/**
 * A real hand-drawn nub is not a mirrored isoceles triangle — one edge is
 * short and steep, the other long and shallow, so the apex reads as flicked
 * to one side. These reproduce that asymmetry on whichever edge it lands.
 */
const TAIL_HALF_BASE = 7.75;
const TAIL_APEX_FRACTION = 0.677;
const TAIL_DEPTH = 19;

const EDGE_NORMAL: Record<BubblePlacement, { nx: number; ny: number }> = {
  top: { nx: 0, ny: -1 },
  right: { nx: 1, ny: 0 },
  bottom: { nx: 0, ny: 1 },
  left: { nx: -1, ny: 0 },
};

/**
 * roundedRectBoundary winds clockwise, so the bottom and left edges walk
 * backwards along their axis.
 */
const EDGE_WALKS_INCREASING: Record<BubblePlacement, boolean> = {
  top: true,
  right: true,
  bottom: false,
  left: false,
};

const EDGE_WALK_AXIS: Record<BubblePlacement, 'x' | 'y'> = {
  top: 'x',
  bottom: 'x',
  left: 'y',
  right: 'y',
};

function edgeCenterline(edge: BubblePlacement, width: number, height: number): number {
  switch (edge) {
    case 'bottom':
      return height - STROKE_WIDTH / 2;
    case 'top':
      return STROKE_WIDTH / 2;
    case 'right':
      return width - STROKE_WIDTH / 2;
    case 'left':
      return STROKE_WIDTH / 2;
  }
}

function segmentNormal(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { nx: dy / len, ny: -dx / len };
}

/**
 * Splices the tail's three vertices into the bubble's own boundary samples,
 * replacing whatever samples fell underneath. One wobble pass then perturbs
 * tail and body as a single continuous line — overlaying a separately
 * wobbled tail could never line up, because the two shapes sample different
 * noise.
 */
function spliceTailNotch(
  boundary: BoundarySample[],
  edge: BubblePlacement,
  along: number,
  width: number,
  height: number,
): BoundarySample[] {
  const walkAxis = EDGE_WALK_AXIS[edge];
  const increasing = EDGE_WALKS_INCREASING[edge];
  const normal = EDGE_NORMAL[edge];
  const centerline = edgeCenterline(edge, width, height);
  const outwardSign = edge === 'bottom' || edge === 'right' ? 1 : -1;

  const aWalk = increasing ? along - TAIL_HALF_BASE : along + TAIL_HALF_BASE;
  const bWalk = increasing ? along + TAIL_HALF_BASE : along - TAIL_HALF_BASE;
  const apexWalk = aWalk + (bWalk - aWalk) * TAIL_APEX_FRACTION;
  const apexOutward = centerline + outwardSign * TAIL_DEPTH;

  const toPoint = (walk: number, outward: number): Point =>
    walkAxis === 'x' ? { x: walk, y: outward } : { x: outward, y: walk };

  const pointA = toPoint(aWalk, centerline);
  const apex = toPoint(apexWalk, apexOutward);
  const pointB = toPoint(bWalk, centerline);

  const minWalk = Math.min(aWalk, bWalk);
  const maxWalk = Math.max(aWalk, bWalk);

  const result: BoundarySample[] = [];
  const newIndices: number[] = [];
  let inserted = false;

  for (const sample of boundary) {
    const onEdge = sample.nx === normal.nx && sample.ny === normal.ny;
    const walk = walkAxis === 'x' ? sample.x : sample.y;

    if (onEdge && walk > minWalk && walk < maxWalk) {
      if (!inserted) {
        newIndices.push(result.length, result.length + 1, result.length + 2);
        result.push(
          { ...pointA, nx: 0, ny: 0, t: 0 },
          { ...apex, nx: 0, ny: 0, t: 0 },
          { ...pointB, nx: 0, ny: 0, t: 0 },
        );
        inserted = true;
      }
      continue;
    }
    result.push(sample);
  }

  // The three new points need mitered normals against their new neighbours.
  const count = result.length;
  for (const i of newIndices) {
    const prev = result[(i - 1 + count) % count]!;
    const next = result[(i + 1) % count]!;
    const n1 = segmentNormal(prev, result[i]!);
    const n2 = segmentNormal(result[i]!, next);
    const nx = n1.nx + n2.nx;
    const ny = n1.ny + n2.ny;
    const len = Math.hypot(nx, ny) || 1;
    result[i] = { ...result[i]!, nx: nx / len, ny: ny / len };
  }

  // Re-thread arc-length so noise samples continuously through the splice
  // rather than jumping at the seam.
  let t = 0;
  result[0] = { ...result[0]!, t: 0 };
  for (let i = 1; i < count; i++) {
    t += Math.hypot(result[i]!.x - result[i - 1]!.x, result[i]!.y - result[i - 1]!.y);
    result[i] = { ...result[i]!, t };
  }

  return result;
}

export function DialogueBubble({
  children,
  placement = 'bottom',
  showTail = true,
  paddingX = 28,
  paddingY = 16,
}: DialogueBubbleProps) {
  const { size, onLayout } = useMeasuredSize();
  const { width, height } = size;

  const ribbon = useMemo(() => {
    if (width <= 0 || height <= 0) return null;

    const isHorizontal = placement === 'top' || placement === 'bottom';
    const runLength = isHorizontal ? width : height;
    // Keep the tail on the straight run — never in a rounded corner.
    const along = Math.min(Math.max(runLength / 2, CORNER_RADIUS), runLength - CORNER_RADIUS);

    const innerWidth = Math.max(width - STROKE_WIDTH, 1);
    const innerHeight = Math.max(height - STROKE_WIDTH, 1);
    const radius = Math.min(innerHeight / 2, CORNER_RADIUS);

    const base = roundedRectBoundary(innerWidth, innerHeight, radius);
    const boundary = showTail
      ? spliceTailNotch(base, placement, along, innerWidth, innerHeight)
      : base;

    return generateWobbleRibbon(boundary, {
      seed: seeds.bubble,
      halfWidth: STROKE_WIDTH / 2,
      wiggle: stroke.wiggle,
      frequency: BUBBLE_FREQUENCY,
      smoothen: 0.5,
      widthVariance: stroke.widthVariance,
    });
  }, [width, height, placement, showTail]);

  // The tail protrudes past the box, so give the canvas room on every side.
  const pad = TAIL_DEPTH + STROKE_WIDTH;

  return (
    <View onLayout={onLayout} style={[styles.bubble, { paddingHorizontal: paddingX, paddingVertical: paddingY }]}>
      {ribbon && (
        <View style={[styles.outline, { margin: -pad }]}>
          <Svg width={width + pad * 2} height={height + pad * 2}>
            <G x={pad + STROKE_WIDTH / 2} y={pad + STROKE_WIDTH / 2}>
              <Path d={ribbon.fillPath} fill={colors.white} />
              <Path d={ribbon.ribbonPath} fill={colors.brown} fillRule="evenodd" />
            </G>
          </Svg>
        </View>
      )}
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    minHeight: MIN_HEIGHT,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.brown,
    textAlign: 'center',
  },
});
