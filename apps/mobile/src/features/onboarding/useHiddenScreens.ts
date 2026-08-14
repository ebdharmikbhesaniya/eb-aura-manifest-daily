import type { OnboardingScreenId } from '@aura/shared';
import { useMemo } from 'react';

import { EXPERIMENTS, ON_OFF_VARIANTS } from '@/features/experiments/keys';
import { useVariant } from '@/features/experiments/useVariant';

/**
 * The set of onboarding screens the active experiments hide (2026-08-14).
 *
 * Two on/off experiments gate a single conversation screen each — `control`
 * (shipped) shows it, `off` removes it from the flow:
 *   • onboarding-dream-home → hides `s07-dream-home`
 *   • onboarding-commit-beat → hides `s13-commit`
 *
 * Reading each flag makes PostHog emit `$feature_flag_called` (the exposure).
 * The navigation helpers (`nextScreen`/`previousScreen`) and the progress
 * counter take this set so a hidden screen is skipped in BOTH directions and
 * the header never counts a step the user won't see. Flags load async, so this
 * starts as the empty set (everyone on control) and narrows once flags arrive.
 */
export function useHiddenScreens(): ReadonlySet<OnboardingScreenId> {
  const dreamHome = useVariant(EXPERIMENTS.onboardingDreamHome, 'control', ON_OFF_VARIANTS);
  const commitBeat = useVariant(EXPERIMENTS.onboardingCommitBeat, 'control', ON_OFF_VARIANTS);

  return useMemo(() => {
    const hidden = new Set<OnboardingScreenId>();
    if (dreamHome === 'off') hidden.add('s07-dream-home');
    if (commitBeat === 'off') hidden.add('s13-commit');
    return hidden;
  }, [dreamHome, commitBeat]);
}
