/**
 * Telling a real cancel apart from a broken sign-in flow (03 §2.2).
 *
 * Google's iOS SDK returns `kGIDSignInErrorCodeCanceled` for TWO different
 * things: she dismissed the sheet, and the OAuth callback never made it back to
 * the app. The SDK gives us no way to distinguish them, and that ambiguity is
 * exactly how a hard configuration bug once presented as "the button does
 * nothing at all": the `ExpoAdapterGoogleSignIn` AppDelegate subscriber was
 * missing, so every completed sign-in came back as a cancel, and a cancel is
 * silent by design — no message, no error, nothing reported. It stayed invisible
 * until someone read the native SDK source.
 *
 * The signal we DO have is repetition. One cancel is ordinary: people open the
 * sheet and change their mind. A SECOND cancel in the same session with no
 * success in between is not how people behave — it is how a broken callback
 * behaves, because every attempt fails identically. So the first cancel stays
 * silent (she meant it), and from the second on we stop assuming intent: she
 * gets told something is wrong, and it is reported.
 *
 * Deliberately pure and dependency-free so the rule is testable without a native
 * module, a device, or a Google account.
 */

/**
 * Consecutive cancels, with no success in between, at which a cancel stops being
 * read as a decision.
 *
 * Two, not one: a single silent cancel is correct behaviour and must stay that
 * way — apologising to someone who simply changed her mind is worse than saying
 * nothing. Two is the first point where "she meant it" is the less likely story.
 */
export const UNEXPECTED_CANCEL_THRESHOLD = 2;

/**
 * Should this cancel be surfaced rather than swallowed?
 *
 * @param consecutiveCancels How many cancels in a row, INCLUDING this one.
 */
export function isUnexpectedCancel(consecutiveCancels: number): boolean {
  return consecutiveCancels >= UNEXPECTED_CANCEL_THRESHOLD;
}
