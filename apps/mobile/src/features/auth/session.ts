import * as AppleAuthentication from 'expo-apple-authentication';

import { wipeDeviceState } from '@/lib/accountReset';
import { analytics } from '@/lib/analytics';
import { kv, STORAGE_KEYS } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

/**
 * Signing back IN (03 §2.3, "restore on a new device, previously claimed").
 *
 * The mirror image of `features/paywall/claim`, and the reason both exist:
 *
 *   - CLAIMING links an identity to the anonymous user she is already on.
 *     Her id does not change, so her memory survives. That is `claim.ts`.
 *   - SIGNING IN authenticates AS an identity that already has an account,
 *     which necessarily abandons the anonymous user on this device. That is
 *     this file.
 *
 * Using the wrong one silently destroys data, which is why they are not one
 * function with a flag. `claim.ts` says as much in its own header.
 *
 * Every path here wipes local state on success — see `wipeDeviceState`.
 */

export type SignInResult = { status: 'signed_in' } | { status: 'cancelled' } | { status: 'failed' };

/**
 * Whether this account has a way back into it.
 *
 * Anonymous users are the default in this product (03 §2.1), so "claimed" is
 * the exception and has to be asked about rather than assumed. Supabase sets
 * `is_anonymous` on the JWT; the identity list is the belt-and-braces check for
 * a session minted before that claim existed.
 *
 * Errs toward `false` — the caller uses this to decide whether signing out is
 * safe, and a wrong `true` there costs her everything she has written.
 */
export async function isAccountClaimed(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return false;

    if (data.user.is_anonymous === true) return false;

    return (data.user.identities?.length ?? 0) > 0 || Boolean(data.user.email);
  } catch {
    return false;
  }
}

export type AuthProvider = 'google' | 'apple';

export type AuthOutcome =
  /** The identity attached to the account already on this device. Nothing lost. */
  | { status: 'linked' }
  /** The identity belonged to another account; that one is now signed in. */
  | { status: 'signed_in' }
  | { status: 'cancelled' }
  | { status: 'failed' };

/**
 * The one entry point the sign-in wall uses. Tries to KEEP her data first.
 *
 *   1. `linkIdentity` — attaches the identity to the anonymous account this
 *      device is already on. Her user id does not change, so the letter, the
 *      memory and the RevenueCat entitlement keyed to it (03 §4) all survive.
 *      This is the path for a brand-new user AND for anyone who was already
 *      part-way through the conversation before the wall existed.
 *
 *   2. If that identity already belongs to a DIFFERENT account, linking is
 *      refused — and rightly so, since one Google account cannot be two users.
 *      That is the returning-on-a-new-phone case (03 §2.3), so fall back to
 *      authenticating as the account that already holds her letters, and wipe
 *      the local state belonging to the anonymous user we are leaving behind.
 *
 * Order matters and is not interchangeable. Leading with `signInWithIdToken`
 * would strand a part-way conversation every time, silently.
 */
export async function authenticateWithProvider(
  provider: AuthProvider,
  idToken: string,
): Promise<AuthOutcome> {
  const linked = await supabase.auth.linkIdentity({ provider, token: idToken });

  if (!linked.error) {
    analytics.capture('account_claimed', { method: provider === 'apple' ? 'apple' : 'google' });
    return { status: 'linked' };
  }

  if (!isIdentityTakenError(linked.error)) return { status: 'failed' };

  const adopted = await supabase.auth.signInWithIdToken({ provider, token: idToken });
  if (adopted.error) return { status: 'failed' };

  analytics.capture('account_signed_in', { method: provider === 'apple' ? 'apple' : 'google' });
  // She is a different user now; everything local belongs to the one we left.
  wipeDeviceState();
  return { status: 'signed_in' };
}

/**
 * Whether linking failed because the identity is spoken for.
 *
 * This is the ONLY failure that may fall through to signing in. Treating a
 * network blip or an expired token as "already taken" would abandon a live
 * conversation over a retryable error, so the match is deliberately narrow and
 * anything unrecognised stays a plain failure.
 */
function isIdentityTakenError(error: {
  code?: string | undefined;
  message?: string | undefined;
}): boolean {
  if (error.code === 'identity_already_exists') return true;
  const message = error.message?.toLowerCase() ?? '';
  return message.includes('already') && (message.includes('linked') || message.includes('exists'));
}

/**
 * Signs in with Apple as an EXISTING user.
 *
 * `signInWithIdToken`, not `linkIdentity`: she is on a new phone and the point
 * is to become the account that already holds her letters. The anonymous user
 * this device booted with is abandoned here, which is exactly why the callers
 * only offer this when there is nothing on the device worth keeping.
 */
export async function signInWithApple(): Promise<SignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });

    if (!credential.identityToken) return { status: 'failed' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) return { status: 'failed' };

    analytics.capture('account_signed_in', { method: 'apple' });
    wipeDeviceState();
    return { status: 'signed_in' };
  } catch (error) {
    // Apple's sheet reports a user cancel as a thrown error with this code.
    if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
      return { status: 'cancelled' };
    }
    return { status: 'failed' };
  }
}

/**
 * Emails a sign-in link for an existing account.
 *
 * `shouldCreateUser: false` is the whole safety of this path. Left at its
 * default, a typo'd address would quietly MINT a new empty account and sign her
 * into it — she would follow the link, find none of her letters, and reasonably
 * conclude the app lost them. Refusing unknown addresses turns that into an
 * honest "we don't know that address".
 */
export async function sendSignInLink(email: string): Promise<{ sent: boolean }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) return { sent: false };

  // The callback route cannot tell a sign-in link from a claim link — both
  // arrive as bare tokens on `aura://auth/callback` — and the two need opposite
  // handling. Marked here, read and cleared there.
  kv.set(STORAGE_KEYS.pendingSignIn, true);
  return { sent: true };
}

/** Whether the link now being handled was a sign-in rather than a claim. */
export function consumePendingSignIn(): boolean {
  const pending = kv.get<boolean>(STORAGE_KEYS.pendingSignIn) === true;
  if (pending) kv.delete(STORAGE_KEYS.pendingSignIn);
  return pending;
}

/** Fired once the emailed sign-in link is followed and the session is live. */
export function recordEmailSignIn(): void {
  analytics.capture('account_signed_in', { method: 'email' });
}
