import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { useConversation } from '../useConversation';

const MEET_ORB_SIZE = 120;

/**
 * S2 — meet the companion, Onboarding Redesign form (2b): a small orb, the
 * greeting, and a "what to expect" card (seven questions · about four minutes ·
 * yours to edit) in place of the animated chat bubbles. The confidentiality line
 * ("stays between us") still lands before any question is asked.
 */
export function S02MeetAura() {
  const { colors, spacing, radii, typography } = useTheme();
  const { advance } = useConversation('s02-meet-aura');
  const c = onboardingCopy.s02MeetAura;

  return (
    <Screen testID="s02-meet-aura">
      <View style={{ flex: 1, gap: spacing.lg }}>
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <Orb state="listening" size={MEET_ORB_SIZE} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <SerifDisplay variant="display">{c.greeting}</SerifDisplay>
          <Text style={[typography.body, { color: colors.text.secondary }]}>{c.body}</Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            borderRadius: radii.card,
          }}
        >
          {c.expectations.map((item, i) => (
            <View key={item.title}>
              {i > 0 ? (
                <View style={{ height: 1, backgroundColor: colors.surface.divider, marginHorizontal: spacing.md }} />
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                }}
              >
                <LinearGradient
                  colors={[colors.orb.core, colors.orb.halo]}
                  start={{ x: 0.2, y: 0.1 }}
                  end={{ x: 0.9, y: 1 }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.text.onCta }}
                  >
                    {i + 1}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: colors.text.primary }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.text.secondary }}
                  >
                    {item.body}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton title={c.primary} onPress={advance} />
      </View>
    </Screen>
  );
}
