/** Expiry choices offered to users, mapped to their lifetime in milliseconds. */
export const EXPIRY_OPTIONS = {
  "10m": { label: "10 minutes", ms: 10 * 60 * 1000 },
  "1h": { label: "1 hour", ms: 60 * 60 * 1000 },
  "1d": { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  "1w": { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
  never: { label: "Never", ms: null },
} as const satisfies Record<string, { label: string; ms: number | null }>;

/** Key of an expiry option, e.g. `"1h"`. */
export type ExpiryKey = keyof typeof EXPIRY_OPTIONS;

/** Expiry keys as a tuple, usable with `z.enum`. */
export const EXPIRY_KEYS = Object.keys(EXPIRY_OPTIONS) as [ExpiryKey, ...ExpiryKey[]];

/** Computes the absolute expiry date for an option, or `null` for "never". */
export function expiryDate(key: ExpiryKey, now: Date = new Date()): Date | null {
  const ms = EXPIRY_OPTIONS[key].ms;
  return ms === null ? null : new Date(now.getTime() + ms);
}
