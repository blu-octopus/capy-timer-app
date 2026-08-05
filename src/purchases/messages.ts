import type { UnavailableReason } from './types';

/** User-facing copy for each way the coin shop can be unavailable. */
export const UNAVAILABLE_MESSAGES: Record<UnavailableReason, string> = {
  'unsupported-platform': 'The coin shop is only available on iOS and Android.',
  'missing-api-key':
    "The coin shop isn't set up yet — check back once it's ready.",
  'native-module-unavailable':
    'Purchases need the full app, not this preview build.',
};
