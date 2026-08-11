import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { CoinWallet } from '@/components/capy/CoinWallet';
import { Button } from '@/components/ui/Button';
import { InAppPurchaseCard } from '@/components/ui/InAppPurchaseCard';
import { Text } from '@/components/ui/Text';
import { useMeasuredSize, WobbleBorder } from '@/components/ui/WobbleBorder';
import {
  ensurePurchasesConfigured,
  getCoinOfferings,
  purchaseCoins,
  restorePurchases,
  subscribeToPurchaseUpdates,
  type CoinOffering,
} from '@/src/purchases';
import { tapFeedback } from '@/src/feedback';
import { UNAVAILABLE_MESSAGES } from '@/src/purchases/messages';
import { useAppStore } from '@/src/store';
import { colors, seeds } from '@/src/theme/tokens';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'ready'; offerings: CoinOffering[] }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

export default function IapScreen() {
  const router = useRouter();
  const coins = useAppStore((s) => s.wallet.coins);
  const fulfillPurchase = useAppStore((s) => s.fulfillPurchase);
  const syncPremium = useAppStore((s) => s.syncPremium);
  const { size, onLayout } = useMeasuredSize();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const purchasingIdRef = useRef<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    const status = ensurePurchasesConfigured();
    if (!status.available) {
      setState({ kind: 'unavailable', message: UNAVAILABLE_MESSAGES[status.reason] });
      return;
    }

    try {
      const offerings = await getCoinOfferings();
      setState(offerings.length > 0 ? { kind: 'ready', offerings } : { kind: 'empty' });
    } catch {
      setState({
        kind: 'error',
        message: "Couldn't load the shop. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeToPurchaseUpdates((transactionId, amount) => {
      const credited = fulfillPurchase(transactionId, amount);
      if (credited) {
        void syncPremium();
        Alert.alert('Thanks!', `+${amount.toLocaleString('en-US')} coins added.`);
      }
      return credited;
    });
  }, [fulfillPurchase, syncPremium]);

  const onBuy = async (offering: CoinOffering) => {
    if (purchasingIdRef.current) return;
    purchasingIdRef.current = offering.product.id;
    setPurchasingId(offering.product.id);
    const result = await purchaseCoins(offering);
    purchasingIdRef.current = null;
    setPurchasingId(null);

    if (result.outcome === 'success') {
      const credited = fulfillPurchase(result.transactionId, result.coinsAwarded);
      void syncPremium();
      if (credited) {
        Alert.alert('Thanks!', `+${result.coinsAwarded.toLocaleString('en-US')} coins added.`);
      }
    } else if (result.outcome === 'pending') {
      Alert.alert(
        'Purchase pending',
        'Coins will be added once this purchase is approved.',
      );
    } else if (result.outcome === 'error') {
      Alert.alert('Purchase failed', result.message);
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    // Restore is the one path that can hand premium back on a fresh install.
    void syncPremium();

    if (result.outcome === 'error') {
      Alert.alert('Restore failed', result.message);
    } else if (result.entitlementsRestored > 0) {
      Alert.alert('Purchases restored', 'Your entitlements are back.');
    } else {
      Alert.alert(
        'Nothing to restore',
        'Coin packs are one-time purchases, and your balance is saved on this device — there’s nothing extra to bring back.',
      );
    }
  };

  const canRestore = state.kind === 'ready' || state.kind === 'empty';

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel="Close"
        onPress={() => {
          tapFeedback();
          router.back();
        }}
      />

      <View style={styles.popup} onLayout={onLayout}>
        <WobbleBorder width={size.width} height={size.height} radius={20} seed={seeds.modal} />

        <View style={styles.header}>
          <Text variant="h2">In-app Purchase</Text>
          <CoinWallet amount={coins} />
        </View>

        {state.kind === 'loading' && <Text variant="body">Loading...</Text>}

        {state.kind === 'unavailable' && (
          <Text variant="body" style={styles.centerText}>
            {state.message}
          </Text>
        )}

        {state.kind === 'empty' && (
          <Text variant="body" style={styles.centerText}>
            No coin bundles are set up yet — check back soon.
          </Text>
        )}

        {state.kind === 'error' && (
          <View style={styles.errorBlock}>
            <Text variant="body" style={styles.centerText}>
              {state.message}
            </Text>
            <Button label="Try again" variant="ghost" onPress={() => void load()} />
          </View>
        )}

        {state.kind === 'ready' && (
          <View style={styles.tiers}>
            {state.offerings.map((offering) => (
              <InAppPurchaseCard
                key={offering.product.id}
                coins={offering.product.coins}
                priceString={offering.priceString}
                featured={offering.product.featured}
                disabled={purchasingId !== null}
                onPress={() => void onBuy(offering)}
              />
            ))}
          </View>
        )}

        <Text variant="caption" style={styles.thanks}>
          Thank you for supporting the capybaras!
        </Text>

        {canRestore && (
          <Button
            label={restoring ? 'Restoring...' : 'Restore Purchases'}
            variant="ghost"
            disabled={restoring || purchasingId !== null}
            onPress={() => void onRestore()}
          />
        )}

        <Button label="Close" variant="ghost" onPress={router.back} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
  },
  popup: {
    width: '100%',
    maxWidth: 343,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 16,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  tiers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  thanks: {
    textAlign: 'center',
  },
  errorBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
});
