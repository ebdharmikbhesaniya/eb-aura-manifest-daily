import { wipeDeviceState } from '@/lib/accountReset';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

import { authRedirectUrl } from './redirect';

/**
 * Email + password (founder decision, 2026-07-25).
 *
 * This REVERSES doc 03 §6's "no password field anywhere". The rule was written
 * to keep the app with nothing to breach and nothing to reset; the founder's
 * call is that a link round-trip through an inbox costs more sign-ups than the
 * rule saves. Doc 03 has been rewritten rather than left contradicting the code.
 *
 * The claim-vs-sign-in split from `session.ts` is the same here, and is still
 * the difference between keeping her words and losing them:
 *
 *   - SIGN UP converts the anonymous user she is already on into a permanent
 *     one. Her user id does not change, so the draft conversation, the letter
 *     and the RevenueCat entitlement keyed to that id all survive.
 *   - SIGN IN authenticates as an account that already exists, which
 *     necessarily abandons this device's anonymous user — so local state is
 *     wiped, exactly as `signInWithApple` does.
 *
 * Using the wrong one silently destroys data, which is why they are two
 * functions rather than one with a flag.
 */

export type SignUpOutcome =
  /** Converted the anonymous account in place. Nothing lost, session already live. */
  | { status: 'created' }
  /** Created, but the project requires the address be confirmed before the session upgrades. */
  | { status: 'confirm_email' }
  /** The address already has an account — she wants to sign in, not sign up. */
  | { status: 'email_taken' }
  /** Supabase rejected the password. Its own wording is better than a guess. */
  | { status: 'weak_password'; reason: string }
  | { status: 'failed' };

export type PasswordSignInOutcome =
  | { status: 'signed_in' }
  /** Wrong address or wrong password — deliberately not distinguished. */
  | { status: 'wrong_credentials' }
  /** Registered but never confirmed, so there is nothing to sign in to yet. */
  | { status: 'unconfirmed' }
  | { status: 'failed' };

/**
 * Creates the account on top of the anonymous user this device booted with.
 *
 * `updateUser` rather than `signUp` is the whole point. `signUp` would mint a
 * BRAND NEW user and leave the anonymous one — with her half-finished
 * conversation in it — orphaned behind the new session. Supabase's own
 * anonymous-to-permanent path is this one.
 */
export async function signUpWithPassword(email: string, password: string): Promise<SignUpOutcome> {
  try {
    const { data: current } = await supabase.auth.getUser();

    // Only anonymous users can be converted. Anyone else signing up is already
    // somebody, and `signUp` is then the honest call.
    if (current.user?.is_anonymous !== true) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Confirmation link opens the app (03 §2.1), not the Site URL default.
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) return classifySignUpError(error);
      // No session means the project has email confirmation switched on.
      if (!data.session) return { status: 'confirm_email' };
      analytics.capture('account_signed_in', { method: 'password' });
      wipeDeviceState();
      return { status: 'created' };
    }

    const { data, error } = await supabase.auth.updateUser({ email, password });
    if (error) return classifySignUpError(error);

    // With "Confirm email" on, the address lands in `new_email` and the user
    // stays anonymous until she clicks through. Saying "you're in" here would
    // be a lie she discovers on the next cold start.
    if (data.user?.email !== email) return { status: 'confirm_email' };

    analytics.capture('account_claimed', { method: 'password' });
    return { status: 'created' };
  } catch {
    return { status: 'failed' };
  }
}

/**
 * Authenticates as an account that already exists — the new-phone recovery path.
 *
 * Wipes local state on success for the same reason `signInWithApple` does: every
 * MMKV key and cached query still belongs to the anonymous user being left
 * behind, and rendering those over the account she just entered is how one
 * person's words end up on another person's screen.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<PasswordSignInOutcome> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const code = error.code ?? '';
      const message = error.message?.toLowerCase() ?? '';
      if (code === 'email_not_confirmed' || message.includes('not confirmed')) {
        return { status: 'unconfirmed' };
      }
      if (code === 'invalid_credentials' || message.includes('invalid login')) {
        return { status: 'wrong_credentials' };
      }
      return { status: 'failed' };
    }

    analytics.capture('account_signed_in', { method: 'password' });
    wipeDeviceState();
    return { status: 'signed_in' };
  } catch {
    return { status: 'failed' };
  }
}

/**
 * Turns Supabase's error into something the gate can say out loud.
 *
 * "Already registered" is the one worth separating: it is not a failure but a
 * signpost — she has an account and is on the wrong tab.
 */
function classifySignUpError(error: {
  code?: string | undefined;
  message?: string | undefined;
}): SignUpOutcome {
  const code = error.code ?? '';
  const message = error.message ?? '';
  const lower = message.toLowerCase();

  if (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    code === 'identity_already_exists' ||
    (lower.includes('already') && (lower.includes('registered') || lower.includes('exists')))
  ) {
    return { status: 'email_taken' };
  }

  if (code === 'weak_password' || lower.includes('password')) {
    // Supabase states the actual policy ("at least 6 characters"), which is
    // more use to her than anything generic invented here.
    return { status: 'weak_password', reason: message };
  }

  return { status: 'failed' };
}
