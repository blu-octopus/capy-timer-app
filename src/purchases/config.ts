/**
 * Public env vars so a real key can be dropped in later (EAS secrets or
 * .env.local) without touching code. Neither exists yet — no RevenueCat
 * project, no App Store Connect / Play Console products — so these read as
 * empty strings today, and `ensurePurchasesConfigured` treats that as
 * "unavailable" rather than crashing.
 *
 * Read lazily (as functions, not precomputed constants) so tests can set
 * process.env per-case; Expo's build-time inlining of EXPO_PUBLIC_* vars
 * works the same either way; it replaces the expression wherever it appears
 * in source, function body or not.
 */
export function getIosApiKey(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
}

export function getAndroidApiKey(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
}

/**
 * Development escape hatch for the premium tier.
 *
 * Entitlements fail closed, and `react-native-purchases` is a native module
 * that Expo Go cannot link — so without this, every premium surface is
 * permanently unreachable in the fastest dev loop we have. Setting
 * `EXPO_PUBLIC_FORCE_PREMIUM=1` in `.env.local` grants premium locally
 * without a RevenueCat project, a dev build, or a sandbox purchase.
 *
 * Safe by construction in production: EXPO_PUBLIC_* vars are inlined at
 * build time, so a release built without it compiles to a literal `false`.
 * Never set it in an EAS production profile.
 */
export function isPremiumForced(): boolean {
  const value = process.env.EXPO_PUBLIC_FORCE_PREMIUM;
  return value === '1' || value === 'true';
}
