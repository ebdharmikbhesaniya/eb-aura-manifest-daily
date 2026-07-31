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
  notifications: {
    /** The product's notification promise, restated where she'd look for it. */
    subtitle: 'Arrivals only — never nudges',
  },

  claim: {
    subtitle: 'A way back in, on any phone',
  },

  signIn: {
    /** Offered only to an unclaimed account — a claimed one is already in. */
    subtitle: 'Bring an account from another phone',
  },

  legal: {
    terms: {
      title: 'Terms of Service',
      subtitle: 'The agreement you accept by using Aura',
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'What we collect — and what we never do',
    },
  },

  /** The Support & Connect screen and its Settings row (settings/support). */
  support: {
    title: 'Support & Connect',
    /** Subtitle on the Settings row. */
    subtitle: 'Reach us, or find us out there',
    intro:
      'Something on your mind — a problem, an idea, a kind word? Send it our way and a real person will read it.',
    form: {
      emailLabel: 'YOUR EMAIL',
      emailPlaceholder: 'So we can write back',
      messagePlaceholder: 'How can we help?',
      send: 'Send message',
    },
    connectLabel: 'FIND US',
    /** Subject line on the composed email. */
    emailSubject: 'Aura — a message from the app',
  },

  deleteAccount: 'Delete account',
} as const;
