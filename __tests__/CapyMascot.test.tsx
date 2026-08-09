/**
 * Every purchasable companion must render distinct artwork — 'toilet' once
 * silently fell back to the Basic drawing while still costing 2,500 coins.
 *
 * The mood -> art mapping is the other thing worth pinning down: a skin can
 * be missing art for a mood, and the fallback has to stay proportioned to the
 * frames it actually renders rather than the ones it wanted.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import {
  CapyMascot,
  resolveArt,
  skinForCompanionId,
  type CapyMood,
  type CapySkin,
} from '@/components/capy/CapyMascot';

const SKINS: CapySkin[] = ['basic', 'egg', 'fighting', 'toilet', 'avocado'];

describe('CapyMascot', () => {
  it.each(SKINS)('renders the %s skin without crashing', (skin) => {
    const tree = render(<CapyMascot skin={skin} size={190} />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders different art per skin', () => {
    const rendered = SKINS.map((skin) =>
      JSON.stringify(render(<CapyMascot skin={skin} size={190} />).toJSON()),
    );
    expect(new Set(rendered).size).toBe(SKINS.length);
  });

  it('maps unknown companion ids to the basic skin', () => {
    expect(skinForCompanionId('toilet')).toBe('toilet');
    expect(skinForCompanionId('mystery-future-capy')).toBe('basic');
  });
});

describe('resolveArt', () => {
  it('gives the default companion real angry and dancing art', () => {
    // Basic was motion-only for a long time on the belief that its frames
    // were a headless torso needing a separate head composed onto it.
    expect(resolveArt('paused', 'basic').state).toBe('mad');
    expect(resolveArt('celebrating', 'basic').state).toBe('dance');
  });

  it.each(SKINS)('renders %s with a distinct frame pair per available state', (skin) => {
    const idle = resolveArt('idle', skin);
    const paused = resolveArt('paused', skin);
    const celebrating = resolveArt('celebrating', skin);

    for (const art of [idle, paused, celebrating]) {
      expect(art.frames[0]).not.toBe(art.frames[1]);
    }
  });

  it('holds the idle pose for a skin with no art for that mood', () => {
    // Toilet Capy has idle frames only.
    const idle = resolveArt('idle', 'toilet');
    const paused = resolveArt('paused', 'toilet');

    expect(paused.state).toBe('idle');
    expect(paused.frames).toEqual(idle.frames);
  });

  it('sizes a fallback at the proportions of the frames it actually renders', () => {
    const idle = resolveArt('idle', 'toilet');
    const paused = resolveArt('paused', 'toilet');

    expect(paused.aspectRatio).toBe(idle.aspectRatio);
  });

  it('widens for the dance, whose frames spread their arms', () => {
    const idle = resolveArt('idle', 'basic');
    const dance = resolveArt('celebrating', 'basic');

    // Sizing the dance at idle's ratio used to letterbox it smaller.
    expect(dance.aspectRatio).toBeGreaterThan(idle.aspectRatio);
  });

  it('treats idle and working as the same drawing', () => {
    const moods: CapyMood[] = ['idle', 'working'];
    const [idle, working] = moods.map((mood) => resolveArt(mood, 'basic'));

    expect(working!.frames).toEqual(idle!.frames);
  });
});
