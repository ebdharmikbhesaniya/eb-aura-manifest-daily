import type { AnalyticsClient, SuperProperties } from '@aura/shared';
import PostHog from 'posthog-react-native';

import { env } from './env';
import { logGa4Event } from './ga4';

/**
 * PostHog wrapper (13 §1).
 *
 * Feature code imports `analytics` from here and never touches the SDK directly.
 * That gives one emitter per event (13 §3 — no double counting) and one audit
 * surface for the privacy rule.
 *
 * Two privacy decisions are baked in and are not preferences:
 *   - **Autocapture is OFF.** It would hoover up screen text and input values —
 *     exactly the content that must never leave the device (13 §1).
 *   - **The typed surface only accepts catalog events** from `@aura/shared`, whose
 *     payloads are enums, booleans and bucketed counts. Passing a struggle or a
 *     name to `capture` is a compile error, not a code-review catch (13 §2).
 */

let client: PostHog | null = null;
let superProperties: Partial<SuperProperties> = {};

/**
 * The ONLY catalog events forwarded to GA4 (spec §3, funnel-only). Kept as data
 * next to the emitter so "what Google receives" is one auditable list.
 *
 * `app_first_open` is deliberately absent — GA4 logs `first_open` automatically,
 * so forwarding it would double-count installs. `purchase_completed` maps to
 * GA4's recommended `purchase` name so Google Ads recognises the conversion.
 */
const GA4_EVENT_NAMES: Record<string, string> = {
  onboarding_completed: 'onboarding_completed',
  purchase_completed: 'purchase',
};

/**
 * Called once during boot (05 §9). Without a key — local dev — analytics stays a
 * no-op rather than failing: PostHog is disabled locally by design (16 §1).
 */
export function initAnalytics(): void {
  const apiKey = env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey || client) return;

  client = new PostHog(apiKey, {
    // Explicit events only — see the privacy note above.
    defaultOptIn: true,
    disabled: false,
    // Point at a self-hosted / local / EU instance when set; PostHog Cloud US
    // otherwise (the SDK default). Feature flags resolve against this host too.
    ...(env.EXPO_PUBLIC_POSTHOG_HOST ? { host: env.EXPO_PUBLIC_POSTHOG_HOST } : {}),
  });
}

/**
 * Feature flags & experiments (2026-08-10).
 *
 * The ONE place the app reads a flag — `useVariant` (features/experiments) wraps
 * this so screens never touch the SDK. Reading a flag makes PostHog emit its own
 * `$feature_flag_called` event, which is how experiment exposure is attributed;
 * we add typed OUTCOME events (trial_started, …) separately.
 *
 * Everything degrades to `undefined` with no client (dev without a key) so a
 * flag outage can only ever fall back to the control path, never break a screen.
 */
export function getFeatureFlag(key: string): boolean | string | undefined {
  return client?.getFeatureFlag(key);
}

/** Pull the latest flags for this user — called once at boot, after identify. */
export async function reloadFeatureFlags(): Promise<void> {
  await client?.reloadFeatureFlagsAsync();
}

/** Subscribe to flag updates (they load asynchronously after boot). */
export function onFeatureFlags(callback: () => void): () => void {
  const unsubscribe = client?.onFeatureFlags(() => callback());
  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
}

function capture(event: string, payload?: Record<string, unknown>): void {
  client?.capture(event, { ...superProperties, ...payload });

  // Fan out the ad-conversion funnel to GA4 — by NAME only, never the payload
  // (spec §6: no content reaches GA4). ga4.ts no-ops unless collection is on.
  //
  // `hasOwnProperty` guard so an event named after an Object prototype member
  // ("toString", "constructor") can't resolve to an inherited function. `.catch`
  // so a native GA4 rejection never surfaces as an unhandled rejection — the
  // PostHog emit above has already happened regardless.
  const ga4Name = Object.prototype.hasOwnProperty.call(GA4_EVENT_NAMES, event)
    ? GA4_EVENT_NAMES[event]
    : undefined;
  if (ga4Name) void logGa4Event(ga4Name).catch(() => {});
}

export const analytics: AnalyticsClient = {
  capture: ((event: string, payload?: Record<string, unknown>) =>
    capture(event, payload)) as AnalyticsClient['capture'],

  /**
   * `userId` is the Supabase uuid — pseudonymous, and the same id RevenueCat and
   * the backend use, so one identity spans every system (13 §1).
   */
  identify(userId: string, props?: Partial<SuperProperties>) {
    if (props) superProperties = { ...superProperties, ...props };
    client?.identify(userId, superProperties);
  },

  register(props: Partial<SuperProperties>) {
    superProperties = { ...superProperties, ...props };
  },

  reset() {
    superProperties = {};
    client?.reset();
  },

  async flush() {
    await client?.flush();
  },
};
