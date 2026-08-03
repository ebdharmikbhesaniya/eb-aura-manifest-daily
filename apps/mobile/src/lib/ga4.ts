import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';

/**
 * Google Analytics 4 (Firebase) — the ad-conversion sink (spec 2026-07-31).
 *
 * Deliberately catalog-unaware: it knows how to talk to Firebase, not which
 * events are allowed. The allowlist and the catalog→GA4 name mapping live in
 * `analytics.ts`, next to the one emitter, so "what Google receives" is one
 * readable, auditable decision separate from "how GA4 works".
 *
 * Collection is gated on APP_ENV: enabled only for the store-bound builds
 * (production/preview), a complete no-op in local development and under jest —
 * the same "no key = no-op" posture PostHog has (spec §8).
 *
 * Uses the modular Firebase Analytics API (v26+): named functions taking the
 * Analytics instance, not the old `analytics().logEvent(...)` namespaced form.
 */

let enabled = false;

/** Store-bound builds collect; everything else stays silent. */
function shouldEnable(): boolean {
  const env = process.env.APP_ENV;
  return env === 'production' || env === 'preview';
}

export function initGa4(): void {
  enabled = shouldEnable();
  // Fire-and-forget: nothing downstream waits on the toggle, and a rejected
  // promise here must never break boot.
  void setAnalyticsCollectionEnabled(getAnalytics(), enabled);
}

export function isGa4Enabled(): boolean {
  return enabled;
}

/**
 * Logs a single GA4 event by NAME only — never any params (spec §6: no content
 * reaches GA4). No-op unless collection is enabled.
 */
export async function logGa4Event(name: string): Promise<void> {
  if (!enabled) return;
  await logEvent(getAnalytics(), name);
}
