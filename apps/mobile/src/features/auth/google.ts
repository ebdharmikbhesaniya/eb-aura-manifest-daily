import Constants from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';

import { env } from '@/lib/env';

import { isUnexpectedCancel } from './cancelStreak';

/**
 * Google Sign-In (03 §2.2).
 *
 * The module is required LAZILY, exactly like `useSpeech` does for expo-speech.
 * This is a native module: a dev client built before it was added has no such
 * native side, and a top-level import would take the whole app down at startup
 * rather than costing one button. Sign-in is now the first screen, so a crash
 * here is a crash before anything.
 */

interface GoogleSignInModule {
  GoogleSignin: {
    configure: (options: { webClientId: string; offlineAccess?: boolean }) => void;
    hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
    signIn: () => Promise<{ data?: { idToken?: string | null } | null; idToken?: string | null }>;
    signOut: () => Promise<unknown>;
  };
}

let configured = false;

function loadModule(): GoogleSignInModule | null {
  try {
    // The library's entry runs TurboModuleRegistry.getEnforcing('RNGoogleSignin')
    // at import time. When the native module isn't in the binary that THROWS —
    // and under the New Architecture the throw escapes this try/catch and takes
    // the whole app down at startup (a black screen on the very first screen),
    // which is the exact failure this lazy loader was meant to avoid. Probe with
    // the non-throwing get() first and never import the wrapper without it, so a
    // build missing the native side degrades to a hidden button, not a crash.
    if (TurboModuleRegistry.get('RNGoogleSignin') == null) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    return null;
  }
}

/**
 * Whether Google can be offered at all.
 *
 * False when the client id is unset (an unconfigured dev build) or the native
 * module is missing. The sign-in screen hides the button rather than drawing a
 * dead one — the same mistake Settings was making with Apple on Android.
 */
export function googleAuthAvailable(): boolean {
  if (!env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) return false;

  // Google Sign-In is only available natively if client config files were present during the build
  const hasConfig = Constants.expoConfig?.extra?.hasGoogleSignInConfig ?? false;
  if (!hasConfig) return false;

  return loadModule() !== null;
}

export type GoogleTokenResult =
  | { status: 'ok'; idToken: string }
  /**
   * `unexpected` is true when this "cancel" is more likely a broken sign-in flow
   * than her decision (see `cancelStreak.ts`). Callers must show something when
   * it is true — a silent dead end is what let a configuration bug hide.
   */
  | { status: 'cancelled'; unexpected: boolean }
  | { status: 'failed' };

/**
 * Consecutive cancels with no success in between. Module-level so it spans taps
 * within a session; a successful sign-in clears it.
 */
let consecutiveCancels = 0;

/**
 * Returns a Google id_token for Supabase to verify.
 *
 * This does NOT create the Supabase session — the caller decides whether the
 * token should LINK to the current anonymous user or authenticate as an
 * existing one, and that decision is the difference between keeping her data
 * and abandoning it (see `authenticateWithProvider`).
 */
export async function getGoogleIdToken(): Promise<GoogleTokenResult> {
  const mod = loadModule();
  const webClientId = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!mod || !webClientId) return { status: 'failed' };

  try {
    if (!configured) {
      mod.GoogleSignin.configure({ webClientId });
      configured = true;
    }

    await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await mod.GoogleSignin.signIn();

    // v13+ nests the payload under `data`; older builds return it flat. Reading
    // both keeps this working across a dev-client upgrade.
    const idToken = result.data?.idToken ?? result.idToken ?? null;
    // A resolved sign-in with no id token is a configuration problem (missing
    // webClientId / SHA-1), not a user cancel — surface it as a failure.
    if (!idToken) return { status: 'failed' };

    // A real token clears any suspicion built up by earlier cancels.
    consecutiveCancels = 0;
    return { status: 'ok', idToken };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    // The library reports a user-dismissed sheet as a thrown error (SIGN_IN_CANCELLED).
    // Other codes are real failures, not a deliberate cancel: 12501 can mean a
    // misconfigured OAuth client / SHA-1, and 7 (NETWORK_ERROR) means Play Services
    // could not reach Google's token endpoint (e.g. an IPv6-only network).
    if (code === 'SIGN_IN_CANCELLED') {
      consecutiveCancels += 1;
      const unexpected = isUnexpectedCancel(consecutiveCancels);

      // Logged only once it looks like a broken flow, never on an ordinary
      // cancel — otherwise every person who changes her mind becomes noise. The
      // message names the usual cause, because the one time this happened it
      // took reading the native SDK to find it.
      if (unexpected && __DEV__) {
        console.warn(
          `[auth] Google sign-in cancelled ${consecutiveCancels}x in a row — likely a dropped ` +
            `OAuth callback (check the reversed-client-id URL scheme and that ` +
            `ExpoAdapterGoogleSignIn is autolinked), not a user cancel`,
        );
      }

      return { status: 'cancelled', unexpected };
    }
    consecutiveCancels = 0;
    return { status: 'failed' };
  }
}

/** Clears Google's own cached account so the next sign-in re-prompts. */
export async function googleSignOut(): Promise<void> {
  const mod = loadModule();
  if (!mod || !configured) return;
  await mod.GoogleSignin.signOut().catch(() => undefined);
}
