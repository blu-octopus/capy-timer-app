/**
 * Entitlements fail closed: anything short of a confirmed active `premium`
 * entitlement is the free tier. These tests are mostly about the failure
 * paths, because those are what a real user hits — offline, mid-expiry, or
 * on a build where the native module isn't linked at all.
 */

import Purchases from 'react-native-purchases';

import { hasPremium, PREMIUM_ENTITLEMENT_ID } from '@/src/purchases/entitlements';
import { resetPurchasesStatusForTests } from '@/src/purchases';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));

const mockedGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock;
const mockedConfigure = Purchases.configure as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetPurchasesStatusForTests();
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key';
  process.env.EXPO_PUBLIC_FORCE_PREMIUM = '';
});

describe('hasPremium', () => {
  it('is true when the premium entitlement is active', async () => {
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { [PREMIUM_ENTITLEMENT_ID]: { isActive: true } } },
    });

    await expect(hasPremium()).resolves.toBe(true);
  });

  it('is false when some other entitlement is active but premium is not', async () => {
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { somethingElse: {} } },
    });

    await expect(hasPremium()).resolves.toBe(false);
  });

  it('is false when no entitlements are active', async () => {
    mockedGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });

    await expect(hasPremium()).resolves.toBe(false);
  });

  it('fails closed — and does not throw — when the lookup rejects', async () => {
    mockedGetCustomerInfo.mockRejectedValue(new Error('offline'));

    await expect(hasPremium()).resolves.toBe(false);
  });

  it('is false without asking RevenueCat when purchases are unavailable', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
    resetPurchasesStatusForTests();

    await expect(hasPremium()).resolves.toBe(false);
    expect(mockedGetCustomerInfo).not.toHaveBeenCalled();
  });

  it('does not cache, so a purchase takes effect without a relaunch', async () => {
    mockedGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    await expect(hasPremium()).resolves.toBe(false);

    // The customer buys premium; the very next read must see it.
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { [PREMIUM_ENTITLEMENT_ID]: {} } },
    });

    await expect(hasPremium()).resolves.toBe(true);
    expect(mockedGetCustomerInfo).toHaveBeenCalledTimes(2);
  });

  it('grants premium via the dev override without touching the SDK', async () => {
    process.env.EXPO_PUBLIC_FORCE_PREMIUM = '1';
    // Even with purchases fully unavailable, the override still wins —
    // that is the whole point of it in Expo Go.
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
    resetPurchasesStatusForTests();

    await expect(hasPremium()).resolves.toBe(true);
    expect(mockedGetCustomerInfo).not.toHaveBeenCalled();
    expect(mockedConfigure).not.toHaveBeenCalled();
  });
});
