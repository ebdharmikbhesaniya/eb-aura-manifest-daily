import { Text, View } from 'react-native';

import { Card, PillButton, Screen } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { fonts } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

/**
 * A03 — social proof (merged from the Aura design). Structure kept as designed;
 * the figures and reviews are PLACEHOLDERS (see the copy file) and must be
 * replaced with verified numbers and real store reviews before shipping — the
 * design's own rule, and the app's honesty stance.
 */
export function A03SocialProof() {
  const { colors, spacing } = useTheme();
  const { advance } = useConversation('a03-social-proof');
  const copy = onboardingCopy.a03SocialProof;

  // Three overlapping accent discs, echoing the design's avatar cluster.
  const avatarTints = [colors.accent.blush, colors.accent.emberSoft, colors.accent.oliveSoft];

  return (
    <Screen testID="a03-social-proof">
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flexDirection: 'row' }}>
            {avatarTints.map((tint, i) => (
              <View
                key={tint}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: tint,
                  borderWidth: 2.5,
                  borderColor: colors.bg.base,
                  marginLeft: i === 0 ? 0 : -12,
                }}
              />
            ))}
          </View>
          <Text
            style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text.secondary }}
          >
            {copy.rating}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 30,
            lineHeight: 34,
            letterSpacing: -0.6,
            color: colors.text.primary,
          }}
        >
          {copy.heading}
        </Text>

        <View style={{ gap: spacing.sm }}>
          {copy.reviews.map((review) => (
            <Card key={review.who} variant="glassy">
              <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                <Text style={{ color: colors.accent.emberDeep, fontSize: 14, letterSpacing: 2 }}>
                  ★★★★★
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 19,
                    lineHeight: 26,
                    color: colors.text.primary,
                  }}
                >
                  {`“${review.quote}”`}
                </Text>
                <Text
                  style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text.label }}
                >
                  {review.who}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton title={copy.primary} onPress={advance} />
      </View>
    </Screen>
  );
}
