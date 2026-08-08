import { Platform } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
} from 'react-native-purchases';

import { getAndroidApiKey, getIosApiKey } from './config';
import { COIN_PRODUCTS, type CoinProduct } from './products';
import type { PurchasesStatus } from './types';

export type { PurchasesStatus, UnavailableReason } from './types';

let status: PurchasesStatus | null = null;

function apiKeyForPlatform(): string {
  if (Platform.OS === 'ios') return getIosApiKey();
  if (Platform.OS === 'android') return getAndroidApiKey();
  return '';
}

/**
 * Configures the SDK at most once and caches the outcome. `configure()` is
 * synchronous and throws immediately if the native module isn't linked —
 * which is exactly the Expo Go case, since react-native-purchases requires a
 * custom dev client. That throw is how "unavailable" is detected; there is
 * no separate capability check to call first.
 */
export function ensurePurchasesConfigured(): PurchasesStatus {
  if (status) return status;

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (status = { available: false, reason: 'unsupported-platform' });
  }

  const apiKey = apiKeyForPlatform();
  if (!apiKey) {
    // Expected today: no RevenueCat project exists yet.
    return (status = { available: false, reason: 'missing-api-key' });
  }

  try {
    Purchases.configure({ apiKey });
    return (status = { available: true });
  } catch (error) {
    console.warn('[purchases] configure failed', error);
    return (status = { available: false, reason: 'native-module-unavailable' });
  }
}

/** Test-only: clears the cached outcome so each test configures fresh. */
export function resetPurchasesStatusForTests(): void {
  status = null;
}

export interface CoinOffering {
  product: CoinProduct;
  pkg: PurchasesPackage;
  priceString: string;
}

/**
 * Matches the catalogue in products.ts against whatever the RevenueCat
 * dashboard's current offering actually contains. A product listed here
 * with no matching package (because it hasn't been created in App Store
 * Connect / Play Console / RevenueCat yet) is silently omitted rather than
 * shown as a broken tile.
 */
export async function getCoinOfferings(): Promise<CoinOffering[]> {
  const s = ensurePurchasesConfigured();
  if (!s.available) return [];

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];

    const matched: CoinOffering[] = [];
    for (const product of COIN_PRODUCTS) {
      const pkg = current.availablePackages.find((p) => p.product.identifier === product.id);
      if (pkg) matched.push({ product, pkg, priceString: pkg.product.priceString });
    }
    return matched;
  } catch (error) {
    console.warn('[purchases] getOfferings failed', error);
    return [];
  }
}

export type PurchaseResult =
  | { outcome: 'success'; coinsAwarded: number }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; message: string };

export async function purchaseCoins(offering: CoinOffering): Promise<PurchaseResult> {
  try {
    await Purchases.purchasePackage(offering.pkg);
    return { outcome: 'success', coinsAwarded: offering.product.coins };
  } catch (error) {
    const code = (error as { code?: PURCHASES_ERROR_CODE })?.code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { outcome: 'cancelled' };
    }
    console.warn('[purchases] purchase failed', error);
    const message = error instanceof Error ? error.message : 'Purchase failed';
    return { outcome: 'error', message };
  }
}

export type RestoreResult =
  | { outcome: 'success'; entitlementsRestored: number }
  | { outcome: 'error'; message: string };

/**
 * Coin packs are consumables — StoreKit/Play Billing can't restore them,
 * and the wallet already persists locally, so a fresh install keeps
 * whatever coins were on that device. This still calls through to
 * RevenueCat (App Store review expects a working Restore button whenever
 * IAP exists, and it future-proofs any non-consumable entitlements added
 * later) and reports how many active entitlements came back, honestly —
 * today that's reliably zero.
 */
export async function restorePurchases(): Promise<RestoreResult> {
  const status = ensurePurchasesConfigured();
  if (!status.available) {
    return { outcome: 'error', message: 'Purchases are not available.' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return {
      outcome: 'success',
      entitlementsRestored: Object.keys(customerInfo.entitlements.active).length,
    };
  } catch (error) {
    console.warn('[purchases] restore failed', error);
    const message = error instanceof Error ? error.message : 'Restore failed';
    return { outcome: 'error', message };
  }
}
