import { Text, View } from 'react-native';

import { PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { NotificationHero } from '../NotificationHero';
import { useConversation } from '../useConversation';

/**
 * A12 — the notification pre-prompt (merged from the Aura design). It previews
 * the actual reminder, so the OS permission dialog on the NEXT screen
 * (s12-notifications) lands on a reason, never cold. Carries no answer; Continue
 * advances to that real ask. Replaces s12-why-notifications.
 *
 * Laid out as a centred beat (bell hero → line → preview → note) rather than a
 * top-aligned question over a small card, so the screen reads full, not empty.
 */
export function A12Reminder() {
  const { colors, spacing, radii, shadows, typography } = useTheme();
  const { advance } = useConversation('a12-reminder');
  const c = onboardingCopy.a12Reminder;

  return (
    <Screen testID="a12-reminder">
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <NotificationHero icon="notifications" />

        <View style={{ gap: spacing.sm }}>
          <SerifDisplay variant="question" center>
            {c.question}
          </SerifDisplay>
          <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
            {c.helper}
          </Text>
        </View>

        {/* A facsimile of the real push, so she sees what she is opting into. */}
        <View
          style={{
            backgroundColor: colors.surface.card,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            padding: spacing.md,
            gap: spacing.sm,
            ...shadows.card,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: colors.orb.core }}
            />
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: colors.text.label,
              }}
            >
              {c.previewApp}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.text.primary }}>
            {c.previewBody}
          </Text>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton title={c.primary} onPress={() => advance()} />
      </View>
    </Screen>
  );
}
