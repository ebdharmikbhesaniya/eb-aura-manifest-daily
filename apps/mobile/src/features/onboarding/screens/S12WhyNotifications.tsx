import { Text, View } from 'react-native';

import { IconTile } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { NotificationHero } from '../NotificationHero';
import { useConversation } from '../useConversation';

/** One icon per benefit — the glyphs live here, not in copy (as the paywall does). */
const BENEFIT_ICONS = ['time-outline', 'leaf-outline', 'toggle-outline'] as const;

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
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
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
      <View style={{ gap: spacing.xl, paddingTop: spacing.sm }}>
        <NotificationHero icon="notifications" />

        {/* Benefit rows in the paywall's own visual language: ember orb tiles,
            a bold line and a quiet one — not a bullet list. */}
        <View style={{ gap: spacing.lg }}>
          {c.benefits.map((benefit, i) => (
            <View
              key={benefit.title}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <IconTile tint="orb" icon={BENEFIT_ICONS[i] ?? 'notifications-outline'} />
              <View style={{ flex: 1, gap: spacing.xs / 2 }}>
                <Text
                  allowFontScaling={false}
                  style={[scaledType('listTitle', scale), { color: colors.text.primary }]}
                >
                  {benefit.title}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
                >
                  {benefit.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ConversationScreen>
  );
}
