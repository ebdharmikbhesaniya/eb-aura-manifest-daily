import type { GatedFeature } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Orb, PillButton, Sheet, TextButton, SerifDisplay } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { priceLine } from './pricing';
import { loadPlans } from './purchases';

/** The small orb over the title (v4 §locked sheet). */
const ORB_SIZE = 44;

export interface LockedFeatureSheetProps {
  feature: GatedFeature | null;
  onSeePlans: () => void;
  onDismiss: () => void;
}

/**
 * The locked-feature sheet (12 §3, v4 §sheets — "calm, honest, dismissible").
 *
 * A CALM BOTTOM SHEET, never a full-screen interrupt — that distinction is the
 * whole design. Centered: the small orb, the serif title, the feature line in
 * her language, and the honest price straight from the store before she is
 * asked to look at anything.
 *
 * "Not now" is a real answer and is always present. There is no second, quieter
 * offer if she takes it (product 15 bans Aya's discount-chase pattern outright).
 */
export const LockedFeatureSheet = forwardRef<BottomSheetModal, LockedFeatureSheetProps>(
  function LockedFeatureSheet({ feature, onSeePlans, onDismiss }, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();

    // The honest price line, from the store — never a constant (product 15).
    const [price, setPrice] = useState<string | null>(null);

    useEffect(() => {
      if (!feature) return;
      // Which locked feature she reached for is the most useful signal the free
      // tier produces — it says what to build, and what to unlock.
      analytics.capture('locked_feature_touched', { feature });
      analytics.capture('paywall_viewed', { surface: 'locked_feature' });

      void loadPlans().then((plans) => {
        const annual = plans.find((plan) => plan.id === 'annual');
        setPrice(annual ? priceLine(annual.id, annual.price, annual.monthlyEquivalent) : null);
      });
    }, [feature]);

    return (
      <Sheet ref={ref} snapPoints={['48%']} onDismiss={onDismiss}>
        <BottomSheetView
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
        >
          <View style={{ alignItems: 'center' }}>
            <Orb state="idle" size={ORB_SIZE} testID="locked-orb" />
          </View>

          <SerifDisplay variant="sheetTitle" center>
            {paywallCopy.locked.title}
          </SerifDisplay>

          {feature && (
            <Text
              allowFontScaling={false}
              style={[
                scaledType('body', scale),
                { color: colors.text.secondary, textAlign: 'center' },
              ]}
            >
              {paywallCopy.locked.features[feature]}
            </Text>
          )}

          {price && (
            <Text
              testID="locked-price"
              allowFontScaling={false}
              style={[
                scaledType('bodySmall', scale),
                { color: colors.text.body, textAlign: 'center' },
              ]}
            >
              {price}
            </Text>
          )}

          <PillButton
            title={paywallCopy.locked.cta}
            onPress={onSeePlans}
            testID="locked-see-plans"
          />

          <View style={{ alignItems: 'center' }}>
            <TextButton
              title={paywallCopy.locked.dismiss}
              onPress={onDismiss}
              testID="locked-not-now"
            />
          </View>
        </BottomSheetView>
      </Sheet>
    );
  },
);
