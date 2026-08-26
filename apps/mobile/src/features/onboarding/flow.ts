import type { OnboardingAnswerType, OnboardingScreenId } from '@aura/shared';

/**
 * The Conversation's shape (product 07): one question per screen, fixed order,
 * skip allowed on personal questions — never on name.
 *
 * This module is pure so resume, edit-guard and analytics logic are testable
 * without a navigator.
 */

export const SCREEN_ORDER: readonly OnboardingScreenId[] = [
  // Funnel front-matter, merged from the Aura design (2026-08-26): a splash, a
  // value beat and social proof replace the old s01-welcome / s02-meet-aura intro.
  'a01-splash',
  'a02-value',
  'a03-social-proof',
  // The quizzes fold onto existing profile fields so nothing is asked twice:
  // goals → `values`, obstacle → `struggle`. Feeling is new (the safety router).
  // s06-values and s10-struggle are therefore dropped from the flow below.
  'a04-goals',
  'a05-feeling',
  'a06-obstacle',
  's03-name',
  's04-self-description',
  's05-work-feeling',
  // Dream-home re-enabled (2026-08-10): sensory concreteness feeds vivid Letters,
  // and the depth is what converts (Glow's data — removing personal questions
  // cratered conversion). s08-dream-city and s09-people stay retired for now —
  // their ids/columns are kept but their screens were removed.
  's07-dream-home',
  's11-arrival-time',
  // The commitment beat (2026-08-10): a quiet "are you ready" moment after she
  // has shared everything, before the wow. Committing to a goal lifts follow-
  // through (Duolingo/Headway pattern) — said in the future-self voice, never a
  // coercive hold.
  's13-commit',
  // The notification education beat (2026-08-10): a dedicated screen that
  // explains WHY the reminder matters — the moment is delivered by it — BEFORE
  // the ask, so the OS prompt lands on a reason rather than cold.
  's12-why-notifications',
  // The closing step: the OS notification permission ask. Moved here from
  // post-paywall (Home) so she opts in with her arrival time still fresh.
  's12-notifications',
];

/** Skippable per product 07: S4. Never S3. (s10-struggle is retired from the flow.) */
export const SKIPPABLE: ReadonlySet<OnboardingScreenId> = new Set(['s04-self-description']);

export const ANSWER_TYPE: Record<OnboardingScreenId, OnboardingAnswerType> = {
  'a01-splash': 'none',
  'a02-value': 'none',
  'a03-social-proof': 'none',
  'a04-goals': 'multi_choice',
  'a05-feeling': 'choice',
  'a06-obstacle': 'choice',
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
  // Commitment + education + permission — none carries an answer or a progress step.
  's13-commit': 'none',
  's12-why-notifications': 'none',
  's12-notifications': 'none',
};

/** Screens that carry an answer — the denominator for `questions_answered`. */
export const QUESTION_SCREENS: readonly OnboardingScreenId[] = SCREEN_ORDER.filter(
  (id) => ANSWER_TYPE[id] !== 'none',
);

const NO_HIDDEN: ReadonlySet<OnboardingScreenId> = new Set();

/**
 * The next screen after `current`, skipping any an experiment has hidden (see
 * useHiddenScreens). `hidden` defaults to empty, so the shipped flow and every
 * existing caller behave exactly as before.
 */
export function nextScreen(
  current: OnboardingScreenId,
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
): OnboardingScreenId | null {
  for (let i = SCREEN_ORDER.indexOf(current) + 1; i < SCREEN_ORDER.length; i++) {
    const id = SCREEN_ORDER[i];
    if (id && !hidden.has(id)) return id;
  }
  return null;
}

/** The previous visible screen before `current`, skipping hidden ones symmetrically. */
export function previousScreen(
  current: OnboardingScreenId,
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
): OnboardingScreenId | null {
  for (let i = SCREEN_ORDER.indexOf(current) - 1; i >= 0; i--) {
    const id = SCREEN_ORDER[i];
    if (id && !hidden.has(id)) return id;
  }
  return null;
}

/** The question screens actually shown given `hidden` — the honest progress denominator. */
export function visibleQuestionScreens(
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
): readonly OnboardingScreenId[] {
  return QUESTION_SCREENS.filter((id) => !hidden.has(id));
}

/** Expo Router path for a screen id — route files are named by id (06 §1). */
export function screenRoute(id: OnboardingScreenId): string {
  return `/(onboarding)/${id}`;
}
