import { useRouter } from 'expo-router';

import { Screen } from '@/components';
import { WhatAuraKnows } from '@/features/memory/WhatAuraKnows';

/**
 * Push route from Profile (06 §1). Thin — the feature owns the logic (01 §2).
 *
 * Wrapped in `Screen` like every other pushed route: without it the list had no
 * safe area, so its header sat under the status bar and its footer under the
 * navigation bar. `edgeToEdge` because the list supplies its own margins.
 */
export default function WhatAuraKnowsRoute() {
  const router = useRouter();

  return (
    <Screen testID="what-aura-knows" edgeToEdge>
      <WhatAuraKnows onBack={() => router.back()} />
    </Screen>
  );
}
