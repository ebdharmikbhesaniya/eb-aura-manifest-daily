import { Redirect } from 'expo-router';

import { screenRoute } from '@/features/onboarding/flow';
import { resumeScreen, useOnboardingDraft } from '@/stores/onboardingDraft';

/**
 * Entry to the conversation: fresh drafts land on S1; a killed-mid-flow app
 * resumes at the exact screen she left (product 07 global edges). The draft
 * store is MMKV-persisted, so this works on a cold start.
 *
 * Deliberately NOT `index.tsx`. Expo Router groups are path-transparent, so an
 * index inside `(onboarding)` does not sit at `/(onboarding)` — it IS `/`, the
 * app's initial route. The unconditional redirect below then raced the boot gate
 * on every cold start and won, which is how the sign-in wall came to be skipped
 * entirely. `/` now belongs to `app/index.tsx` and the gate alone;
 * `src/lib/rootRoute.test.ts` pins that layout so it cannot regress.
 */
export default function OnboardingEntry() {
  const state = useOnboardingDraft();

  return <Redirect href={screenRoute(resumeScreen(state)) as never} />;
}
