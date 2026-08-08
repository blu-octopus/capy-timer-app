/**
 * Every purchasable companion must render distinct artwork — 'toilet' once
 * silently fell back to the Basic drawing while still costing 2,500 coins.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import { CapyMascot, skinForCompanionId, type CapySkin } from '@/components/capy/CapyMascot';

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
