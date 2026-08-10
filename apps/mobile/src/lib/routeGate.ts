import type { Profile } from '@/hooks/useProfile';

/** Where boot sends her (05 §9, 06 §1). */
export type BootRoute =
  '/(auth)/sign-in' | '/(onboarding)/resume' | '/letter' | '/paywall' | '/(tabs)/home';

export interface BootState {
  /**
   * Does this account have an identity on it (03 §2.2)?
   *
   * Sign-in is required before anything else. Anonymous boot still happens
   * underneath — it is what gives her a real user and real RLS from the first
   * frame — but she cannot pass this gate until an identity is attached to it.
   */
  claimed: boolean;
  profile: Pick<Profile, 'onboarding_completed_at'>;
  /** Is there a `ready` letter waiting for her? */
  hasLetter: boolean;
  /** Has she actually heard it? Local flag, set when she leaves the Letter (06 §3). */
  letterSeen: boolean;
  /** Does RevenueCat report an active premium entitlement (a trial counts)? */
  premium: boolean;
  /**
   * Is the wall enforceable — i.e. can a purchasable offering exist on this build
   * (`isConfigured()`)? When false (no RC key), the gate must not lock anyone
   * out: a monetization outage degrades to Home, never a broken launch (12 §2).
   */
  paywallEnforceable: boolean;
}

/**
 * Pure so it can be tested without a navigator — the branching, not the routing,
 * is what's easy to get wrong.
 *
 * The order IS the session-1 funnel (06 §3), and each gate is ahead of the next
 * for a reason:
 *
 *   sign-in → onboarding → letter → paywall → home
 *
 * The sign-in gate is first and unconditional (founder decision, 2026-07-24 —
 * it REVERSES the anonymous-first position doc 03 §2.1 shipped with). Nothing
 * she writes is reachable before an identity exists to own it, which also means
 * the new-phone recovery case can no longer be lost by accident.
 *
 * `onboarding_completed_at` is the single source of truth for "has she finished
 * the conversation" (02 §1); a half-finished one resumes from its draft.
 *
 * The letter gate sits ahead of the paywall because the wow must be spent before
 * the ask — that ordering is the product's central monetization decision
 * (product 08 §why pre-paywall), not an implementation detail.
 *
 * The paywall is now a HARD gate (2026-08-10, founder decision): entry requires
 * an active subscription, decided by LIVE entitlement rather than a
 * dismissed-once flag, so a force-quit/relaunch cannot bypass it. Only an
 * unenforceable wall (no offering — never brick the launch) or an actual
 * `premium` reaches Home. The letter still plays first; the wow is spent before
 * the ask.
 */
export function resolveBootRoute(state: BootState): BootRoute {
  if (!state.claimed) return '/(auth)/sign-in';
  // `/(onboarding)/resume`, not `/(onboarding)`: the group adds nothing to the
  // path, so the bare group is `/` — this route's own front door.
  if (!state.profile.onboarding_completed_at) return '/(onboarding)/resume';
  if (state.hasLetter && !state.letterSeen) return '/letter';
  if (state.paywallEnforceable && !state.premium) return '/paywall';
  return '/(tabs)/home';
}
