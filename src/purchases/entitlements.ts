import Purchases from 'react-native-purchases';

import { isPremiumForced } from './config';
import { ensurePurchasesConfigured } from './index';

/**
 * The RevenueCat entitlement id that unlocks everything premium. One
 * entitlement covers every premium SKU (monthly/annual/lifetime), so the app
 * never has to know which one a customer actually bought — it only asks
 * "is `premium` active?".
 */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/** Distinguishes "we know they are not premium" from "we could not ask". */
export type PremiumLookup = { kind: 'active' } | { kind: 'inactive' } | { kind: 'unknown' };

/**
 * Three-way lookup so a failed network call cannot wipe a persisted
 * `isPremium: true`. `hasPremium` stays fail-closed for callers that need a boolean.
 */
export async function lookupPremium(): Promise<PremiumLookup> {
  if (isPremiumForced()) return { kind: 'active' };

  const status = ensurePurchasesConfigured();
  if (!status.available) return { kind: 'unknown' };

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined
      ? { kind: 'active' }
      : { kind: 'inactive' };
  } catch (error) {
    console.warn('[purchases] getCustomerInfo failed', error);
    return { kind: 'unknown' };
  }
}

/**
 * Whether the customer currently has premium.
 *
 * Deliberately **not** memoized, unlike `ensurePurchasesConfigured`: the
 * answer changes the instant someone buys or restores, and a cached `false`
 * would leave a paying customer locked out until they relaunched. Callers
 * are rare by design (launch, post-purchase, post-restore), so the network
 * round-trip costs nothing meaningful.
 *
 * Fails **closed** — any error, or Web/Expo Go where the native module isn't
 * linked, resolves `false`. That means the premium UI is unreachable in Expo
 * Go, which is why the dev override exists (see `isPremiumForced`).
 */
export async function hasPremium(): Promise<boolean> {
  const lookup = await lookupPremium();
  return lookup.kind === 'active';
}
