import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { loadPlans } from '@/features/paywall/purchases';
import { analytics } from '@/lib/analytics';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

/** V4 hero orb — larger than the component default; no token governs orb sizes. */
const SPLASH_ORB_SIZE = 180;

/**
 * A01 — splash (merged from the Aura design). The orb is the mark; a single
 * serif line sets the tone.
 *
 * This is now the first onboarding screen, so it inherits two jobs the old
 * s01-welcome used to own: it starts the funnel clock (`onboarding_started`
 * fires once, guarded by startedAt), and it carries the price-first honesty line
 * (product 01 §radical pricing honesty — the price belongs on the FIRST screen,
 * not in fine print). The figure is the LOCALIZED RevenueCat price, never a
 * hardcoded constant; the honest fallback covers first launch before it loads.
 */
export function A01Splash() {
  const { colors, spacing, typography } = useTheme();
  const { advance } = useConversation('a01-splash');
  const start = useOnboardingDraft((s) => s.start);
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans().then((plans) => {
      const annual = plans.find((plan) => plan.id === 'annual');
      if (annual) setPrice(annual.price);
    });
  }, []);

  const priceLine = price
    ? onboardingCopy.s01Welcome.priceHonesty.replace('{price}', `${price}/year`)
    : onboardingCopy.s01Welcome.priceUnknown;

  return (
    <Screen testID="a01-splash">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <Orb state="idle" size={SPLASH_ORB_SIZE} />
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <SerifDisplay variant="display" center>
            {onboardingCopy.a01Splash.tagline}
          </SerifDisplay>
          <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
            {priceLine}
          </Text>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
        <View style={{ width: '100%' }}>
          <PillButton
            title={onboardingCopy.s01Welcome.primary}
            onPress={() => {
              // Funnel clock starts at first engagement, once (product 17).
              if (useOnboardingDraft.getState().startedAt === null) {
                analytics.capture('onboarding_started');
              }
              start();
              advance();
            }}
          />
        </View>
        <Text
          style={[
            typography.label,
            { color: colors.text.label, textAlign: 'center', letterSpacing: 3 },
          ]}
        >
          {onboardingCopy.a01Splash.brand}
        </Text>
      </View>
    </Screen>
  );
}
