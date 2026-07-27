import * as Linking from 'expo-linking';

/**
 * Where Supabase sends every email link back to (03 §2.1).
 *
 * `emailRedirectTo` on sign-up confirmation, the magic sign-in link and the
 * email-claim link all point here. Without it Supabase falls back to the
 * project's Site URL — a dev default of http://localhost:3000 — so the link
 * confirms the address and then dead-ends in a browser instead of opening the
 * app. `Linking.createURL` builds the scheme-based URL for this build, so it is
 * `aura://auth/callback`, which `app/auth/callback.tsx` handles.
 *
 * The URL must also be allow-listed in Supabase → Auth → URL Configuration →
 * Redirect URLs, or Supabase ignores it and uses the Site URL anyway.
 */
export function authRedirectUrl(): string {
  return Linking.createURL('/auth/callback');
}
