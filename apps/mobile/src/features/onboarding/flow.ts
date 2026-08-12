import type { OnboardingAnswerType, OnboardingScreenId } from '@aura/shared';

/**
 * The Conversation's shape (product 07): one question per screen, fixed order,
 * skip allowed on personal questions — never on name.
 *
 * This module is pure so resume, edit-guard and analytics logic are testable
 * without a navigator.
 */

export const SCREEN_ORDER: readonly OnboardingScreenId[] = [
  's01-welcome',
  's02-meet-aura',
  's03-name',
  's04-self-description',
  's05-work-feeling',
  's06-values',
  // s08-dream-city and s09-people were retired from the flow (2026-07-30): the
  // conversation is now six questions. Their ids/columns are kept (see
  // OnboardingScreenId) but they no longer ask.
  's10-struggle',
  's11-arrival-time',
  // The notification education beat (2026-08-10): a dedicated screen that
  // explains WHY the reminder matters — the moment is delivered by it — BEFORE
  // the ask, so the OS prompt lands on a reason rather than cold.
  's12-why-notifications',
  // The closing step: the OS notification permission ask. Moved here from
  // post-paywall (Home) so she opts in with her arrival time still fresh.
  's12-notifications',
];

/** Skippable per product 07: S4, S10. Never S3. */
export const SKIPPABLE: ReadonlySet<OnboardingScreenId> = new Set([
  's04-self-description',
  's10-struggle',
]);

export const ANSWER_TYPE: Record<OnboardingScreenId, OnboardingAnswerType> = {
  's01-welcome': 'none',
  's02-meet-aura': 'none',
  's03-name': 'text',
  's04-self-description': 'text',
  's05-work-feeling': 'choice',
  's06-values': 'multi_choice',
  's07-dream-home': 'choice',
  's08-dream-city': 'text',
  's09-people': 'people',
  's10-struggle': 'text',
  's11-arrival-time': 'time',
  // Education + permission — neither carries an answer or draws a progress step.
  's12-why-notifications': 'none',
  's12-notifications': 'none',
};

/** Screens that carry an answer — the denominator for `questions_answered`. */
export const QUESTION_SCREENS: readonly OnboardingScreenId[] = SCREEN_ORDER.filter(
  (id) => ANSWER_TYPE[id] !== 'none',
);

export function nextScreen(current: OnboardingScreenId): OnboardingScreenId | null {
  const index = SCREEN_ORDER.indexOf(current);
  return SCREEN_ORDER[index + 1] ?? null;
}

export function previousScreen(current: OnboardingScreenId): OnboardingScreenId | null {
  const index = SCREEN_ORDER.indexOf(current);
  return index > 0 ? (SCREEN_ORDER[index - 1] ?? null) : null;
}

/** Expo Router path for a screen id — route files are named by id (06 §1). */
export function screenRoute(id: OnboardingScreenId): string {
  return `/(onboarding)/${id}`;
}
