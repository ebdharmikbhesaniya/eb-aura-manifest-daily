import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Card } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * S12-why — the notification education beat (founder decision, 2026-08-10).
 *
 * A dedicated screen BEFORE the OS permission ask, explaining why the reminder
 * is the core of the ritual: the moment is written daily and DELIVERED by the
 * notification — without it the words just wait, unseen. It carries no answer
 * and draws no progress step; "Continue" advances to the ask (s12-notifications).
 *
 * This is the honest version of the pattern: it informs, it does not pressure —
 * the actual yes/no still happens at the OS prompt on the next screen, and a
 * "Maybe later" is available there.
 */
export function S12WhyNotifications() {
  const { colors, spacing, typography } = useTheme();
  const { advance } = useConversation('s12-why-notifications');
  const c = onboardingCopy.s12WhyNotifications;

  return (
    <ConversationScreen
      testID="s12-why-notifications"
      // No progress header (carries no answer) and no edit-guard on an
      // informational screen — same as S1/S2 and S12.
      showEditGuard={false}
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={advance}
    >
      <Card variant="solid" style={{ backgroundColor: colors.accent.parchment }}>
        <View style={{ gap: spacing.sm }}>
          {c.benefits.map((line) => (
            <View
              key={line}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.accent.ember} />
              <Text style={[typography.bodySmall, { color: colors.text.secondary, flex: 1 }]}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ConversationScreen>
  );
}
