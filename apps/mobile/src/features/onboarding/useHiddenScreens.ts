import type { OnboardingScreenId } from '@aura/shared';
import { useMemo } from 'react';

import { EXPERIMENTS, ON_OFF_VARIANTS } from '@/features/experiments/keys';
import { useVariant } from '@/features/experiments/useVariant';

/**
 * The set of onboarding screens the active experiments hide.
 *
 * The two on/off flags used to gate `s07-dream-home` and `a10-commitment`;
 * both screens left with Onboarding v5 (2026-09-01), so today the set is
 * empty whatever the flags say. The flags are still read so PostHog keeps
 * emitting the exposure, and the plumbing stays for the next experiment —
 * `nextScreen`/`previousScreen` and the progress track all take this set.
 */
export function useHiddenScreens(): ReadonlySet<OnboardingScreenId> {
  useVariant(EXPERIMENTS.onboardingDreamHome, 'control', ON_OFF_VARIANTS);
  useVariant(EXPERIMENTS.onboardingCommitBeat, 'control', ON_OFF_VARIANTS);

  return useMemo(() => new Set<OnboardingScreenId>(), []);
}
