import { queryClient } from '@/lib/queryClient';
import { kv } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

/**
 * Drops the session and every trace of her that lives on this device (03 §5
 * step 5, 14 §6).
 *
 * This is the step account deletion never performed. The endpoint deleted the
 * user server-side and the app then routed straight to `/(onboarding)` still
 * holding the old session, the old MMKV draft and a warm query cache — so the
 * conversation resumed at whatever screen she had been parked on rather than
 * starting over, and her previous answers were still sitting there waiting to
 * be re-committed against a brand-new account.
 *
 * The order matters. Signing out first means that if anything below throws, she
 * is at worst signed out with stale local data, never signed IN with wiped
 * local data — the second is the state that strands rows under an id the app
 * has forgotten.
 */
export async function signOutAndWipeDevice(): Promise<void> {
  // `signOut` clears the secure-store session. Failures are swallowed on
  // purpose: a deleted user's refresh token is already invalid server-side, so
  // this call legitimately errors in the delete path, and it must not be what
  // stops the local wipe from happening.
  await supabase.auth.signOut().catch(() => undefined);
  wipeDeviceState();
}

/**
 * The same local wipe WITHOUT touching the session.
 *
 * This is the signing-IN half. She has just authenticated as a different user,
 * so the session in secure store is the one to keep — but everything MMKV and
 * TanStack hold still belongs to the anonymous account she was on a moment ago,
 * and rendering her new account's Home over the old account's cached moments is
 * how one person's words end up on another person's screen.
 *
 * Safe to call right after a sign-in because the session lives in
 * expo-secure-store, not MMKV (see `lib/storage`), so `clearAll` cannot reach it.
 */
export function wipeDeviceState(): void {
  // MMKV: onboarding draft, letter/paywall seen flags, gratitude entries,
  // ritual progress, notification gate, audio cache index.
  kv.clearAll();

  // Zustand's persist middleware holds its own copy in memory and would write
  // it straight back to MMKV on the next mutation, so clearing the key is not
  // enough on its own.
  useOnboardingDraft.getState().reset();

  // Server data she is no longer entitled to read. Without this the next
  // account renders the previous one's moments for a frame.
  queryClient.clear();

  // Last: flips the boot gate back to `booting` and bumps the nonce, which
  // re-runs `useBoot` and mints the fresh anonymous session.
  useAppState.getState().reset();
}
