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
 * The paywall is a HARD gate (2026-08-10, founder decision): entry requires an
 * active subscription, decided by LIVE entitlement rather than a dismissed-once
 * flag, so a force-quit/relaunch cannot bypass it. The letter still plays first;
 * the wow is spent before the ask.
 *
 * This gate used to ALSO require `paywallEnforceable` — whether RevenueCat held
 * a key — and that check was both redundant and actively wrong. Redundant
 * because the paywall route already refuses to strand anyone: when no
 * purchasable offering resolves it takes its own escape hatch to Home, so a
 * keyless build or an RC outage still degrades gracefully (12 §2). Wrong
 * because it answered the question with worse information: a KEY existing is
 * not an OFFERING existing, and the paywall knows the latter while this
 * function can only guess at the former.
 *
 * The visible cost was that a build without the key sent everyone straight to
 * Home — the wall unreachable, and untestable, on exactly the builds where you
 * most need to see it. One place decides now, and it is the one that knows.
 */
export function resolveBootRoute(state: BootState): BootRoute {
  if (!state.claimed) return '/(auth)/sign-in';
  // `/(onboarding)/resume`, not `/(onboarding)`: the group adds nothing to the
  // path, so the bare group is `/` — this route's own front door.
  if (!state.profile.onboarding_completed_at) return '/(onboarding)/resume';
  if (state.hasLetter && !state.letterSeen) return '/letter';
  if (!state.premium) return '/paywall';
  return '/(tabs)/home';
}
