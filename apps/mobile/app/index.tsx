import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * `/` — the boot gate's own route, and deliberately empty.
 *
 * Every "let the gate decide" call site replaces to `/`: sign-in's `proceed`
 * (03 §2.2), the magic-link callback, and sign-out from Settings. They mean
 * "re-run the funnel from the top", so the destination must hold still and let
 * `BootGate` route — anything that navigates on its own would pre-empt it.
 *
 * This route used to be `app/(onboarding)/index.tsx`, because Expo Router groups
 * are path-transparent and an index inside `(onboarding)` resolves to `/`. That
 * put a `<Redirect>` into the conversation on the app's initial route, so a cold
 * start went to S1 no matter what the gate decided — the sign-in wall never
 * appeared. `src/lib/rootRoute.test.ts` pins the layout against that regression.
 *
 * Themed rather than `null` so the first frame is the app's background, not a
 * white flash between the splash and wherever she is actually headed.
 */
export default function BootRoute() {
  const { colors } = useTheme();

  return <View style={{ flex: 1, backgroundColor: colors.bg.base }} />;
}
