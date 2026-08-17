import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Session bootstrap (05 §9, 03 §2.1 — reversed 2026-07-27).
 *
 * There is no anonymous fallback any more. The app requires a real identity —
 * email or Google — before it will run, so boot no longer MINTS a session; it
 * only READS the stored one. A returning user has it in secure storage and boots
 * straight in; a first launch has none, and the boot gate sends her to the
 * sign-in wall (see `useBoot` → `setUnauthenticated`).
 *
 * This used to sign in anonymously with a retry/backoff, because losing that
 * call meant she could not use the app at all. Now a missing session is not a
 * failure — it is the unauthenticated state — so there is nothing to retry: this
 * is a local read of secure storage, not a network call.
 */
export async function ensureSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  // The error was previously discarded, which conflated the two outcomes that
  // must never be confused: "there is no stored session" (she has never signed
  // in — the wall is correct) and "we could not VERIFY the stored one" (the
  // refresh failed). Both hand back a null session, and treating the second as
  // the first shows the sign-in wall to a signed-in user, which reads as being
  // silently signed out and losing everything she has written.
  //
  // Throwing routes it to useBoot's catch instead, where it becomes a boot
  // failure with the honest "I can't reach you right now" line and leaves the
  // stored session untouched for the next launch.
  if (error) throw new Error(error.message);

  return data.session;
}
