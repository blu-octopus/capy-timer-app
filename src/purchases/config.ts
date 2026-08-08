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
