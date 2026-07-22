import { Pressable, Text, View } from 'react-native';

import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { priceLine } from './pricing';
import type { OfferedPlan } from './purchases';

export interface PlanCardProps {
  plan: OfferedPlan;
  selected: boolean;
  onSelect: () => void;
  testID?: string;
}

/**
 * One plan option (product 15 §spec, v4 §paywall — "honest numbers").
 *
 * The monthly equivalent is PRINTED under the headline price rather than left
 * for her to work out. That is the trust signature of this whole surface: the
 * competitor complaint we are designing against is "$10/week!!! Greedy &
 * misleading" from users who only did the multiplication after being charged.
 *
 * Trial terms are restated on the weekly card's sub-line as well as on Apple's
 * sheet (checklist #3) — "restated at the moment of confirmation" means both
 * places, not either. The annual card floats its "Best value" badge in the ink
 * pill with the soft-ember label — the one earned flourish on the surface.
 */
export function PlanCard({ plan, selected, onSelect, testID }: PlanCardProps) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  const annual = plan.id === 'annual';
  const name = annual ? paywallCopy.plans.annualName : paywallCopy.plans.weeklyName;
  const cadence = annual ? paywallCopy.plans.perYear : paywallCopy.plans.perWeek;

  // The a11y label keeps the full one-line honest price the tests pin.
  const spoken = priceLine(plan.id, plan.price, plan.monthlyEquivalent);

  const equivalent = plan.monthlyEquivalent
    ? (annual ? paywallCopy.plans.annualEquivalent : paywallCopy.plans.weeklyEquivalent).replace(
        '{monthly}',
        plan.monthlyEquivalent,
      )
    : null;
  const subLine = [equivalent, plan.hasTrial ? paywallCopy.plans.trialNote : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${spoken}${plan.hasTrial ? `. ${paywallCopy.plans.trialNote}` : ''}`}
      onPress={onSelect}
      style={{
        borderRadius: radii.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.cta.background : colors.surface.border,
        backgroundColor: colors.surface.card,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.xs,
      }}
    >
      {annual && (
        <View
          style={{
            position: 'absolute',
            top: -spacing.md,
            left: spacing.lg,
            backgroundColor: colors.cta.background,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <Text
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.accent.emberSoft }]}
          >
            {paywallCopy.plans.annualBadge}
          </Text>
        </View>
      )}

      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text
          allowFontScaling={false}
          style={[scaledType('headline', scale), { color: colors.text.primary }]}
        >
          {name}
        </Text>

        <Text
          allowFontScaling={false}
          style={[scaledType('headline', scale), { color: colors.text.primary }]}
        >
          {plan.price}
          <Text style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}>
            {cadence}
          </Text>
        </Text>
      </View>

      {subLine !== '' && (
        <Text
          allowFontScaling={false}
          style={[
            scaledType('bodySmall', scale),
            // The annual arithmetic earns the deep-ember voice; weekly stays quiet.
            { color: annual ? colors.accent.emberDeep : colors.text.secondary },
          ]}
        >
          {subLine}
        </Text>
      )}
    </Pressable>
  );
}
