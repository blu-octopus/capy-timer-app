export type UnavailableReason =
  | 'unsupported-platform'
  | 'missing-api-key'
  | 'native-module-unavailable';

export type PurchasesStatus =
  | { available: true }
  | { available: false; reason: UnavailableReason };
