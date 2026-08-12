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
  const { data } = await supabase.auth.getSession();
  return data.session;
}
