/**
 * Covers the screen wiring itself — that the mount effect actually resolves
 * through ensurePurchasesConfigured/getCoinOfferings into the right visible
 * state, and that a successful purchase credits the wallet. This is the
 * exact "does the effect run and update state" question the web preview
 * could not reliably answer in this environment, so it's verified here
 * against the real React reconciler instead.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import IapScreen from '@/app/iap';
import { useAppStore } from '@/src/store';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('@/src/purchases', () => ({
  ensurePurchasesConfigured: jest.fn(),
  getCoinOfferings: jest.fn(),
  purchaseCoins: jest.fn(),
  restorePurchases: jest.fn(),
}));

import {
  ensurePurchasesConfigured,
  getCoinOfferings,
  purchaseCoins,
  restorePurchases,
} from '@/src/purchases';

const mockedEnsure = ensurePurchasesConfigured as jest.Mock;
const mockedGetOfferings = getCoinOfferings as jest.Mock;
const mockedPurchase = purchaseCoins as jest.Mock;
const mockedRestore = restorePurchases as jest.Mock;

const offering = {
  product: { id: 'capycoins_1000', coins: 1000 },
  pkg: {},
  priceString: '$0.99',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAppStore.setState({ wallet: { coins: 200 } });
});

describe('IapScreen', () => {
  it('shows the unavailable message when purchases cannot be configured', async () => {
    mockedEnsure.mockReturnValue({
      available: false,
      reason: 'missing-api-key',
    });

    render(<IapScreen />);

    // ensurePurchasesConfigured resolves synchronously in this mock, so the
    // transient loading frame isn't reliably observable here — the point is
    // the eventual, settled state.
    await waitFor(() =>
      expect(screen.getByText(/coin shop isn't set up yet/i)).toBeTruthy(),
    );
    expect(mockedGetOfferings).not.toHaveBeenCalled();
  });

  it('renders a card per offering once purchases are available', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);

    render(<IapScreen />);

    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());
    expect(screen.getByText('$0.99')).toBeTruthy();
  });

  it('shows an empty message when available but no offerings are configured', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([]);

    render(<IapScreen />);

    await waitFor(() => expect(screen.getByText(/check back soon/i)).toBeTruthy());
  });

  it('credits the wallet and confirms after a successful purchase', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);
    mockedPurchase.mockResolvedValue({ outcome: 'success', coinsAwarded: 1000 });

    render(<IapScreen />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /1,000 coins/i }));
    });

    await waitFor(() => expect(useAppStore.getState().wallet.coins).toBe(1200));
    expect(Alert.alert).toHaveBeenCalledWith('Thanks!', expect.stringContaining('+1,000'));
  });

  it('does not credit the wallet or alert when the purchase is cancelled', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);
    mockedPurchase.mockResolvedValue({ outcome: 'cancelled' });

    render(<IapScreen />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /1,000 coins/i }));
    });

    await waitFor(() => expect(mockedPurchase).toHaveBeenCalled());
    expect(useAppStore.getState().wallet.coins).toBe(200);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('surfaces an error alert without crediting coins when the purchase fails', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);
    mockedPurchase.mockResolvedValue({ outcome: 'error', message: 'Card declined' });

    render(<IapScreen />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /1,000 coins/i }));
    });

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Purchase failed', 'Card declined'),
    );
    expect(useAppStore.getState().wallet.coins).toBe(200);
  });

  it('hides the Restore Purchases button while the shop is unavailable', async () => {
    mockedEnsure.mockReturnValue({ available: false, reason: 'missing-api-key' });

    render(<IapScreen />);

    await waitFor(() => expect(screen.getByText(/coin shop isn't set up yet/i)).toBeTruthy());
    expect(screen.queryByText('Restore Purchases')).toBeNull();
  });

  it('tells the user honestly that consumables have nothing to restore', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);
    mockedRestore.mockResolvedValue({ outcome: 'success', entitlementsRestored: 0 });

    render(<IapScreen />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Restore Purchases'));
    });

    await waitFor(() => expect(mockedRestore).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith(
      'Nothing to restore',
      expect.stringContaining('one-time purchases'),
    );
  });

  it('confirms when the restore actually finds active entitlements', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);
    mockedRestore.mockResolvedValue({ outcome: 'success', entitlementsRestored: 1 });

    render(<IapScreen />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Restore Purchases'));
    });

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Purchases restored', expect.any(String)),
    );
  });

  it('surfaces a restore failure without crashing', async () => {
    mockedEnsure.mockReturnValue({ available: true });
    mockedGetOfferings.mockResolvedValue([offering]);
    mockedRestore.mockResolvedValue({ outcome: 'error', message: 'Network unreachable' });

    render(<IapScreen />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Restore Purchases'));
    });

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Restore failed', 'Network unreachable'),
    );
  });
});
