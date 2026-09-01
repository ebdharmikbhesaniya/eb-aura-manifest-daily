import { onboardingCopy } from '@/copy/onboarding';

import { ChoiceScreen } from '../ChoiceScreen';

/**
 * Q10 — calibration. Conditional: shown only when the mood and believability
 * answers disagree (flow.ts). "It feels fake" / "I want it to be true" soften
 * the framing back to process.
 */
export function QCalibration() {
  const c = onboardingCopy.qCalibration;

  return (
    <ChoiceScreen
      testID="q-calibration"
      screenId="q-calibration"
      eyebrow={c.eyebrow}
      question={c.question}
      options={c.choices}
    />
  );
}
