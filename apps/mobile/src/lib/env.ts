import { z } from 'zod';

/**
 * Public mobile env (01 §6). These ship inside the bundle and are public by
 * design — RLS is the security boundary, not the anon key (00 §D10).
 *
 * `process.env.EXPO_PUBLIC_*` is inlined by Metro at build time, so each var must
 * be referenced by its full literal name. Destructuring `process.env` does not work.
 */
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: z.string().optional(),
  /**
   * Legal links on the paywall footer. Optional here so a dev build runs
   * without them, but BOTH are required before a subscription build passes
   * store review — the footer simply omits a link it has no URL for.
   */
  EXPO_PUBLIC_TERMS_URL: z.string().url().optional(),
  EXPO_PUBLIC_PRIVACY_URL: z.string().url().optional(),
  /**
   * Google's WEB OAuth client id — yes, the web one, on native too. Google
   * issues the id_token Supabase verifies against the web client, and passing
   * the Android client id here yields a token Supabase rejects with an audience
   * mismatch. This is the single most common way to misconfigure this.
   *
   * Optional so a dev build without Google configured still starts; the sign-in
   * screen simply does not offer the Google button (see `features/auth/google`).
   */
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  EXPO_PUBLIC_TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
  EXPO_PUBLIC_PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  // Fail loudly at startup rather than with a confusing network error later.
  throw new Error(
    `Missing/invalid Expo env: ${missing}. Copy .env.example → apps/mobile/.env.local`,
  );
}

export const env = parsed.data;
