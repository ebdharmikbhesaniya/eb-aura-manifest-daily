/**
 * Support contact + social handles (founder-owned content).
 *
 * Kept OUT of the copy catalog on purpose: these are addresses and URLs, not
 * voice strings, so the copy lint should not audit them and they don't belong
 * beside her-facing prose. Fill in the real values below — a social link whose
 * `url` is left blank is simply not rendered (same pattern as the legal rows),
 * so the page degrades gracefully until each handle exists.
 *
 * TODO(founder): replace the social handles once those accounts exist.
 */

/**
 * Where the contact form's message is addressed.
 *
 * MUST match the address on the public support page (backend
 * `legal.content.ts` → SUPPORT). This was `hello@auramanifestdaily.com`, a
 * domain with no A record and no MX record — so every message the contact form
 * composed was addressed into nothing, silently, with the app reporting success.
 */
export const SUPPORT_EMAIL = 'emperorbrains.official@gmail.com';

export interface SocialLink {
  id: string;
  label: string;
  /** Full https URL to the profile. Blank = the row is hidden. */
  url: string;
}

/**
 * Blank until the accounts exist. All three pointed at auramanifestdaily.com
 * handles on a domain that does not resolve, so the rows rendered as taps that
 * went nowhere — worse than an absent row, and a store reviewer taps them.
 * Fill a `url` in and its row comes back on its own.
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { id: 'instagram', label: 'Instagram', url: '' },
  { id: 'x', label: 'X (Twitter)', url: '' },
  { id: 'tiktok', label: 'TikTok', url: '' },
];
