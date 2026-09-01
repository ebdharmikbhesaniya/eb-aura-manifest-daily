import { onboardingCopy } from '@/copy/onboarding';

import { ChoiceScreen } from '../ChoiceScreen';

/** The design lingers a beat longer here — the answer should register before the screen moves. */
const MOOD_ADVANCE_MS = 340;

/**
 * Q5 — mood, the safety router. The KEY persists to `profiles.feeling`;
 * 'low' and 'struggling' set gentle_mode, which shapes the next beat, hides
 * the bold belief card, and suppresses the exit offer.
 */
export function A05Feeling() {
  const c = onboardingCopy.a05Feeling;

  return (
    <ChoiceScreen
      testID="a05-feeling"
      screenId="a05-feeling"
      question={c.question}
      helper={c.helper}
      options={c.choices}
      autoAdvanceMs={MOOD_ADVANCE_MS}
    />
  );
}
