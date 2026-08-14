import { nextScreen, previousScreen, visibleQuestionScreens, QUESTION_SCREENS } from './flow';

describe('flow navigation with experiment-hidden screens', () => {
  it('advances one screen when nothing is hidden (shipped flow)', () => {
    expect(nextScreen('s06-values')).toBe('s07-dream-home');
    expect(nextScreen('s11-arrival-time')).toBe('s13-commit');
  });

  it('skips a hidden screen forward (onboarding-dream-home=off)', () => {
    const hidden = new Set(['s07-dream-home'] as const);
    // s06 → (skip s07) → s10
    expect(nextScreen('s06-values', hidden)).toBe('s10-struggle');
  });

  it('skips a hidden screen backward, symmetrically', () => {
    const hidden = new Set(['s07-dream-home'] as const);
    // s10 → (skip s07) → s06
    expect(previousScreen('s10-struggle', hidden)).toBe('s06-values');
  });

  it('skips the commit beat when onboarding-commit-beat=off', () => {
    const hidden = new Set(['s13-commit'] as const);
    // s11 → (skip s13) → s12-why-notifications
    expect(nextScreen('s11-arrival-time', hidden)).toBe('s12-why-notifications');
    expect(previousScreen('s12-why-notifications', hidden)).toBe('s11-arrival-time');
  });

  it('drops a hidden question from the progress denominator, but not a non-question screen', () => {
    // s07-dream-home is a question screen → hiding it shrinks the count.
    expect(visibleQuestionScreens(new Set(['s07-dream-home'] as const)).length).toBe(
      QUESTION_SCREENS.length - 1,
    );
    // s13-commit carries no answer → not in QUESTION_SCREENS → count unchanged.
    expect(visibleQuestionScreens(new Set(['s13-commit'] as const)).length).toBe(
      QUESTION_SCREENS.length,
    );
  });

  it('returns null past the ends regardless of hidden set', () => {
    expect(nextScreen('s12-notifications')).toBeNull();
    expect(previousScreen('s01-welcome')).toBeNull();
  });
});
