import { useEffect, useState } from 'react';

import { getFeatureFlag, onFeatureFlags } from '@/lib/analytics';

import type { ExperimentKey } from './keys';

/**
 * Read a multivariate experiment's variant for the current user (2026-08-10).
 *
 * Screens call this and never touch the SDK. It:
 *  - starts on `fallback` (always the control / shipped behaviour), so the first
 *    render is correct even before flags have loaded;
 *  - re-reads when PostHog delivers flags (they arrive async after boot);
 *  - returns `fallback` for any value not in `variants` — an unknown or missing
 *    flag can only ever fall back to control, never break a screen.
 *
 * Reading the flag makes PostHog emit `$feature_flag_called`, which is how
 * experiment exposure is attributed; add typed OUTCOME events at the screen.
 */
export function useVariant<T extends string>(
  key: ExperimentKey,
  fallback: T,
  variants: readonly T[],
): T {
  const [variant, setVariant] = useState<T>(fallback);

  useEffect(() => {
    const read = (): T => {
      const value = getFeatureFlag(key);
      return typeof value === 'string' && (variants as readonly string[]).includes(value)
        ? (value as T)
        : fallback;
    };
    setVariant(read());
    return onFeatureFlags(() => setVariant(read()));
    // `fallback` and `variants` are compile-time constants at each call site;
    // keying the effect on the flag key alone avoids needless re-subscription.
  }, [key]);

  return variant;
}

/**
 * Read a simple boolean feature flag. `false` until proven true, so a gated
 * feature stays hidden on a flag outage rather than flickering in.
 */
export function useFeatureFlag(key: ExperimentKey): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const read = () => setEnabled(getFeatureFlag(key) === true);
    read();
    return onFeatureFlags(read);
  }, [key]);

  return enabled;
}
