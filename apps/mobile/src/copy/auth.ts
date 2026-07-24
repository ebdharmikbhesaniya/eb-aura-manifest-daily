/**
 * Signing in and signing out (03 §2.3, §5).
 *
 * The load-bearing honesty here is `signOut.unclaimedBody`. This product boots
 * every user into an anonymous account, so for most people "sign out" is not
 * the reversible housekeeping it is in other apps — it is the end of their
 * letters, with no way back. Saying that plainly, at the moment she taps, is
 * the only defensible version of the button.
 *
 * `signIn.body` is the matching truth on the other side: signing in on a phone
 * that already has words on it replaces them, and she should know before, not
 * after.
 */
export const authCopy = {
  signIn: {
    /** The quiet line under S1's button, and the Settings row title. */
    link: 'Already have an account?',
    action: 'Sign in',
    title: 'Welcome back.',
    body: 'Sign in and your letters, your memory and your subscription come with you.',
    /** Shown when this device already holds an unclaimed conversation. */
    replaceWarning:
      'This phone has words on it that aren’t saved anywhere else. Signing in puts them away for good.',
    apple: 'Continue with Apple',
    email: 'Continue with email',
    emailPlaceholder: 'you@example.com',
    emailSent: 'Check your email — the link signs you straight in.',
    /** `shouldCreateUser: false` means an unknown address is a real answer. */
    emailUnknown: 'I don’t know that address. Try another, or start fresh.',
    later: 'Not now',
  },

  signOut: {
    /** Settings row. */
    title: 'Sign out',
    subtitleClaimed: 'You can sign back in any time',
    subtitleUnclaimed: 'Add a way back in first',

    /** The gate an unclaimed account meets instead of signing out. */
    unclaimedTitle: 'Add a way back in first.',
    unclaimedBody: 'Your letters live on this phone only. Sign out now and they’re gone for good.',
    /** She may still refuse. It is her account, and this is not a hostage. */
    anyway: 'Sign out anyway',

    confirmTitle: 'Sign out?',
    confirmBody: 'Your letters are safe. Sign back in whenever you like.',
    confirm: 'Sign out',
    cancel: 'Stay signed in',
  },
} as const;
