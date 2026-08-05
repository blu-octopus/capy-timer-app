/**
 * react-native-purchases requires a custom dev client — it is not linked in
 * Expo Go, Jest, or the web preview — so `Purchases.configure()` throws
 * synchronously there. That throw is the actual detection mechanism the
 * service relies on for "unavailable," so these tests drive it through the
 * mock below rather than asserting on a separate capability check.
 */

import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';

import {
  ensurePurchasesConfigured,
  getCoinOfferings,
  purchaseCoins,
  resetPurchasesStatusForTests,
} from '@/src/purchases';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));

const mockedConfigure = Purchases.configure as jest.Mock;
const mockedGetOfferings = Purchases.getOfferings as jest.Mock;
const mockedPurchasePackage = Purchases.purchasePackage as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetPurchasesStatusForTests();
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = '';
});

describe('ensurePurchasesConfigured', () => {
  it('reports missing-api-key when no key is set — the real state today', () => {
    const status = ensurePurchasesConfigured();
    expect(status).toEqual({ available: false, reason: 'missing-api-key' });
    expect(mockedConfigure).not.toHaveBeenCalled();
  });

  it('reports native-module-unavailable when configure throws (the Expo Go case)', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
    mockedConfigure.mockImplementation(() => {
      throw new Error('Native module not found');
    });

    const status = ensurePurchasesConfigured();
    expect(status).toEqual({ available: false, reason: 'native-module-unavailable' });
  });

  it('reports available once configure succeeds with a real key', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
    mockedConfigure.mockImplementation(() => undefined);

    expect(ensurePurchasesConfigured()).toEqual({ available: true });
  });

  it('only calls configure once and caches the outcome', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
    mockedConfigure.mockImplementation(() => undefined);

    ensurePurchasesConfigured();
    ensurePurchasesConfigured();
    expect(mockedConfigure).toHaveBeenCalledTimes(1);
  });
});

describe('getCoinOfferings', () => {
  it('returns nothing when purchases are unavailable, without touching the network', async () => {
    const offerings = await getCoinOfferings();
    expect(offerings).toEqual([]);
    expect(mockedGetOfferings).not.toHaveBeenCalled();
  });

  it('matches the catalogue against whatever packages actually exist', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
    mockedConfigure.mockImplementation(() => undefined);
    mockedGetOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          { product: { identifier: 'capycoins_1000', priceString: '$0.99' } },
          { product: { identifier: 'capycoins_10000', priceString: '$4.99' } },
        ],
      },
    });

    const offerings = await getCoinOfferings();
    expect(offerings.map((o) => o.product.id)).toEqual(['capycoins_1000', 'capycoins_10000']);
    expect(offerings[1]!.product.featured).toBe(true);
  });

  it('omits catalogue entries with no matching store product, rather than showing a broken tile', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
    mockedConfigure.mockImplementation(() => undefined);
    mockedGetOfferings.mockResolvedValue({ current: { availablePackages: [] } });

    expect(await getCoinOfferings()).toEqual([]);
  });

  it('returns nothing when there is no current offering configured', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
    mockedConfigure.mockImplementation(() => undefined);
    mockedGetOfferings.mockResolvedValue({ current: null });

    expect(await getCoinOfferings()).toEqual([]);
  });
});

describe('purchaseCoins', () => {
  const offering = {
    product: { id: 'capycoins_1000', coins: 1000 },
    pkg: { product: { identifier: 'capycoins_1000' } },
    priceString: '$0.99',
  } as Parameters<typeof purchaseCoins>[0];

  it('credits the catalogue coin amount on success', async () => {
    mockedPurchasePackage.mockResolvedValue({});
    expect(await purchaseCoins(offering)).toEqual({ outcome: 'success', coinsAwarded: 1000 });
  });

  it('reports cancellation distinctly from a real failure', async () => {
    mockedPurchasePackage.mockRejectedValue({
      code: PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
    });
    expect(await purchaseCoins(offering)).toEqual({ outcome: 'cancelled' });
  });

  it('surfaces other failures with a message', async () => {
    mockedPurchasePackage.mockRejectedValue(new Error('Payment declined'));
    expect(await purchaseCoins(offering)).toEqual({
      outcome: 'error',
      message: 'Payment declined',
    });
  });
});
