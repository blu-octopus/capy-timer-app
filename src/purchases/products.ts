/**
 * Coin bundle catalogue. `id` must match the product identifier created in
 * App Store Connect / Google Play Console and attached to the RevenueCat
 * "default" offering — none of that exists yet (see README), so these ids
 * are a contract for whoever sets that up, not something already live.
 */
export interface CoinProduct {
  id: string;
  coins: number;
  featured?: boolean;
}

export const COIN_PRODUCTS: CoinProduct[] = [
  { id: 'capycoins_1000', coins: 1000 },
  { id: 'capycoins_2000', coins: 2000 },
  { id: 'capycoins_10000', coins: 10000, featured: true },
];
