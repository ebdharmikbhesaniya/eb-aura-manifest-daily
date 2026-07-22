import { ScrollView, Text, View } from 'react-native';

import { Card, PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

import { OutlinePill } from './OutlinePill';

/** The small ember diamond beside the status line (v4 §subscription). */
const DIAMOND_SIZE = 8;

export interface SubscriptionScreenProps {
  premium: boolean;
  inTrial: boolean;
  /** Localized expiry/renewal date, already formatted. */
  renewalDate: string | null;
  willRenew: boolean;
  billingIssue?: boolean;
  onManage: () => void;
  onRestore: () => void;
  onSeePlans: () => void;
  testID?: string;
}

/**
 * Settings → Subscription (12 §2, checklist #5, v4 §subscription).
 *
 * The design rule is subtraction: manage/cancel is ONE tap from here — the
 * outlined pill, deliberately not the loud ink one — and it opens Apple's own
 * sheet rather than anything of ours. There is no "are you sure", no "here's
 * what you'll lose", no retention offer — product 15 bans retention mazes.
 *
 * `lapsedKeepsData` sits on parchment in the voice's italic serif, right where
 * someone considering cancelling will read it: her letter and her memory stay
 * hers (checklist #6). Saying so at the moment of doubt is the difference
 * between a lapse and a betrayal.
 */
export function SubscriptionScreen({
  premium,
  inTrial,
  renewalDate,
  willRenew,
  billingIssue = false,
  onManage,
  onRestore,
  onSeePlans,
  testID,
}: SubscriptionScreenProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const status = inTrial
    ? paywallCopy.subscription.trial
    : premium
      ? paywallCopy.subscription.premium
      : paywallCopy.subscription.free;

  const dateLine =
    renewalDate === null
      ? null
      : (willRenew ? paywallCopy.subscription.renewsOn : paywallCopy.subscription.endsOn).replace(
          '{date}',
          renewalDate,
        );

  return (
    <ScrollView testID={testID} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card
        variant="solid"
        style={{ borderWidth: 1, borderColor: colors.surface.border, gap: spacing.sm }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {/* The ember diamond — the one earned flourish on this surface. */}
          <View
            style={{
              width: DIAMOND_SIZE,
              height: DIAMOND_SIZE,
              backgroundColor: colors.accent.ember,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <Text
            testID="subscription-status"
            allowFontScaling={false}
            style={[scaledType('headline', scale), { color: colors.text.primary }]}
          >
            {status}
          </Text>
        </View>

        {(premium || inTrial) && (
          <Text
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {paywallCopy.contrast.everyDay}
          </Text>
        )}

        {dateLine && (
          <Text
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {dateLine}
          </Text>
        )}

        {billingIssue && (
          // One quiet badge. Product 12 §3 forbids nagging beyond this.
          <Text
            testID="subscription-billing-issue"
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {paywallCopy.subscription.billingIssue}
          </Text>
        )}
      </Card>

      <View style={{ gap: spacing.sm }}>
        {premium ? (
          <OutlinePill
            title={paywallCopy.subscription.manage}
            onPress={onManage}
            testID="subscription-manage"
          />
        ) : (
          <PillButton
            title={paywallCopy.locked.cta}
            onPress={onSeePlans}
            testID="subscription-see-plans"
          />
        )}

        <View style={{ alignItems: 'center' }}>
          <TextButton
            title={paywallCopy.subscription.restore}
            onPress={onRestore}
            testID="subscription-restore"
          />
        </View>
      </View>

      <Card variant="solid" style={{ backgroundColor: colors.accent.parchment }}>
        <Text
          allowFontScaling={false}
          style={[
            scaledType('body', scale),
            { fontFamily: fonts.serifItalic, fontStyle: 'italic', color: colors.text.body },
          ]}
        >
          {paywallCopy.subscription.lapsedKeepsData}
        </Text>
      </Card>
    </ScrollView>
  );
}
