/**
 * syncPremium must not wipe a persisted true when RevenueCat is unreachable.
 * lookupPremium's three-way result is the whole contract.
 */

import Purchases from 'react-native-purchases';

import { resetPurchasesStatusForTests } from '@/src/purchases';
import { PREMIUM_ENTITLEMENT_ID } from '@/src/purchases/entitlements';
import { useAppStore } from '@/src/store';

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
  mockedConfigure.mockImplementation(() => undefined);
  useAppStore.setState({ isPremium: true });
});

describe('syncPremium', () => {
  it('leaves a persisted true alone when the lookup cannot run', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
    resetPurchasesStatusForTests();

    await useAppStore.getState().syncPremium();
    expect(useAppStore.getState().isPremium).toBe(true);
    expect(mockedGetCustomerInfo).not.toHaveBeenCalled();
  });

  it('leaves a persisted true alone when getCustomerInfo rejects', async () => {
    mockedGetCustomerInfo.mockRejectedValue(new Error('offline'));

    await useAppStore.getState().syncPremium();
    expect(useAppStore.getState().isPremium).toBe(true);
  });

  it('clears premium once RevenueCat confirms the entitlement is gone', async () => {
    mockedGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });

    await useAppStore.getState().syncPremium();
    expect(useAppStore.getState().isPremium).toBe(false);
  });

  it('sets premium when the entitlement is active', async () => {
    useAppStore.setState({ isPremium: false });
    mockedGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { [PREMIUM_ENTITLEMENT_ID]: {} } },
    });

    await useAppStore.getState().syncPremium();
    expect(useAppStore.getState().isPremium).toBe(true);
  });
});
