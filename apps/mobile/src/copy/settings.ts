/**
 * Settings copy (v4 §settings — "no mazes").
 *
 * Row titles come from the features that own them (`notificationsCopy.prefs`,
 * `paywallCopy.subscription`, `paywallCopy.claim`); this file holds only the
 * strings that exist because Settings is a screen: the one-line subtitles that
 * tell her what's behind each row before she taps.
 */
export const settingsCopy = {
  /** The screen's own name, beside its back chevron. */
  title: 'Settings',
  /** Development only — never rendered in a build a user sees. */
  previewPaywall: {
    title: 'Preview paywall',
    subtitle: 'Dev only — stand-in prices, cannot purchase',
  },
  notifications: {
    /** The product's notification promise, restated where she'd look for it. */
    subtitle: 'Arrivals only — never nudges',
  },

  claim: {
    subtitle: 'A way back in, on any phone',
  },

  deleteAccount: 'Delete account',
} as const;
