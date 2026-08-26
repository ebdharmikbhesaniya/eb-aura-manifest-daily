import { Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * A12 — the notification pre-prompt (merged from the Aura design). It previews
 * the actual reminder, so the OS permission dialog on the NEXT screen
 * (s12-notifications) lands on a reason, never cold. Carries no answer; Continue
 * advances to that real ask. Replaces s12-why-notifications.
 */
export function A12Reminder() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { advance } = useConversation('a12-reminder');
  const c = onboardingCopy.a12Reminder;

  return (
    <ConversationScreen
      testID="a12-reminder"
      showEditGuard={false}
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => advance()}
    >
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
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              backgroundColor: colors.orb.core,
            }}
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
    </ConversationScreen>
  );
}
