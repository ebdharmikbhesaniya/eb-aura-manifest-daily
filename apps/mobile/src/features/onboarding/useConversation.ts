import type { OnboardingScreenId } from '@aura/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { haptic } from '@/theme/haptics';

import { completeOnboarding, submitAnswer } from './commit';
import { nextScreen, screenRoute } from './flow';
import { useHiddenScreens } from './useHiddenScreens';

/**
 * One hook per conversation screen: views, submits, advances, and understands
 * edit mode (product 07). Screens stay declarative; the flow logic lives here
 * exactly once. `nextScreen` reads the draft so the v5 branches (priority,
 * context, calibration) resolve against what she has actually answered.
 */
export function useConversation(screenId: OnboardingScreenId) {
  const router = useRouter();
  const userId = useAppState((s) => s.userId);
  const isEditing = useOnboardingDraft((s) => s.editReturnScreen !== null);
  const draftAnswer = useOnboardingDraft((s) => s.answers[screenId]);
  // Screens hidden by the onboarding experiments — skipped when advancing.
  const hidden = useHiddenScreens();

  useEffect(() => {
    analytics.capture('onboarding_screen_viewed', { screen_id: screenId });
  }, [screenId]);

  const goNext = async (): Promise<void> => {
    if (isEditing) {
      const returnTo = useOnboardingDraft.getState().endEdit();
      if (returnTo) router.replace(screenRoute(returnTo) as never);
      return;
    }

    const next = nextScreen(screenId, hidden, useOnboardingDraft.getState().answers);
    if (next) {
      useOnboardingDraft.getState().advanceTo(next);
      router.push(screenRoute(next) as never);
      return;
    }

    // Past the last screen the conversation ends and the ritual begins.
    // `replace`, so a back-swipe cannot return her to the conversation.
    if (userId) {
      await completeOnboarding(userId);
      router.replace('/(onboarding)/generating');
    }
  };

  /**
   * Submit an answer and move on. In edit mode the flow returns to where the
   * conversation was (revise, never restart); otherwise it advances.
   */
  const submit = async (value: unknown, skipped = false): Promise<void> => {
    void haptic('onboardingContinue');
    if (userId) await submitAnswer(userId, screenId, value, skipped);
    await goNext();
  };

  /** Skip = a recorded non-answer, then on. */
  const skip = (): Promise<void> => submit(null, true);

  /** Advance without an answer (value beats — no data screens). */
  const advance = (): void => {
    void haptic('onboardingContinue');
    void goNext();
  };

  return {
    submit,
    skip,
    advance,
    isEditing,
    /** Prefill when she re-enters via the edit-guard. */
    existingValue: draftAnswer?.value,
  };
}
