/**
 * Support contact + social handles (founder-owned content).
 *
 * Kept OUT of the copy catalog on purpose: these are addresses and URLs, not
 * voice strings, so the copy lint should not audit them and they don't belong
 * beside her-facing prose. Fill in the real values below — a social link whose
 * `url` is left blank is simply not rendered (same pattern as the legal rows),
 * so the page degrades gracefully until each handle exists.
 *
 * TODO(founder): replace the placeholders with the real support inbox and the
 * real social handles before launch.
 */

/** Where the contact form's message is addressed. */
export const SUPPORT_EMAIL = 'hello@auramanifestdaily.com';

export interface SocialLink {
  id: string;
  label: string;
  /** Full https URL to the profile. Blank = the row is hidden. */
  url: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/auramanifestdaily' },
  { id: 'x', label: 'X (Twitter)', url: 'https://x.com/auramanifestdaily' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@auramanifestdaily' },
];
