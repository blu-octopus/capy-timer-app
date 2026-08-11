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
const pendingProductSince = new Map<string, number>();

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
  pendingProductSince.clear();
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

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  const matched: CoinOffering[] = [];
  for (const product of COIN_PRODUCTS) {
    const pkg = current.availablePackages.find((p) => p.product.identifier === product.id);
    if (pkg) matched.push({ product, pkg, priceString: pkg.product.priceString });
  }
  return matched;
}

type NonSubTxn = {
  productIdentifier?: string;
  transactionIdentifier?: string;
  purchaseDate?: string;
};

type CustomerInfoLike = { nonSubscriptionTransactions?: NonSubTxn[] };

function extractTransactionId(
  result: { customerInfo?: CustomerInfoLike },
  productId: string,
): string | null {
  const txns = result.customerInfo?.nonSubscriptionTransactions;
  if (!Array.isArray(txns)) return null;

  for (let i = txns.length - 1; i >= 0; i--) {
    const txn = txns[i]!;
    if (txn.productIdentifier !== productId) continue;
    if (txn.transactionIdentifier) return txn.transactionIdentifier;
    if (txn.purchaseDate) return `${productId}:${txn.purchaseDate}`;
  }
  return null;
}

export type PurchaseResult =
  | { outcome: 'success'; coinsAwarded: number; transactionId: string }
  | { outcome: 'pending' }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; message: string };

export async function purchaseCoins(offering: CoinOffering): Promise<PurchaseResult> {
  try {
    const result = await Purchases.purchasePackage(offering.pkg);
    const transactionId =
      extractTransactionId(result, offering.product.id) ??
      `${offering.product.id}:${Date.now()}`;
    return { outcome: 'success', coinsAwarded: offering.product.coins, transactionId };
  } catch (error) {
    const code = (error as { code?: PURCHASES_ERROR_CODE | string })?.code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { outcome: 'cancelled' };
    }
    if (String(code).includes('PENDING')) {
      pendingProductSince.set(offering.product.id, Date.now());
      return { outcome: 'pending' };
    }
    console.warn('[purchases] purchase failed', error);
    const message = error instanceof Error ? error.message : 'Purchase failed';
    return { outcome: 'error', message };
  }
}

/**
 * Ask-to-Buy / pending purchases land later via CustomerInfo updates.
 * Only products this process marked pending are fulfilled, so a listener
 * fire on launch cannot replay the entire consumable history.
 */
export function subscribeToPurchaseUpdates(
  fulfill: (transactionId: string, coins: number) => boolean,
): () => void {
  if (!ensurePurchasesConfigured().available) return () => undefined;

  const listener = (info: CustomerInfoLike) => {
    const txns = info.nonSubscriptionTransactions;
    if (!Array.isArray(txns)) return;

    for (const txn of txns) {
      const productId = txn.productIdentifier;
      if (!productId) continue;
      const since = pendingProductSince.get(productId);
      if (since == null) continue;
      const purchasedAt = txn.purchaseDate ? Date.parse(txn.purchaseDate) : NaN;
      if (Number.isFinite(purchasedAt) && purchasedAt + 5000 < since) continue;

      const product = COIN_PRODUCTS.find((p) => p.id === productId);
      if (!product) continue;
      const transactionId = txn.transactionIdentifier ?? `${productId}:${txn.purchaseDate ?? since}`;
      if (fulfill(transactionId, product.coins)) {
        pendingProductSince.delete(productId);
      }
    }
  };

  Purchases.addCustomerInfoUpdateListener(listener as never);
  return () => {
    const remove = (Purchases as { removeCustomerInfoUpdateListener?: (l: typeof listener) => void })
      .removeCustomerInfoUpdateListener;
    remove?.(listener);
  };
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
