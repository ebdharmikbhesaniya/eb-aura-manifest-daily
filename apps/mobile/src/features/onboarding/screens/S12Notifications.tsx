import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';

import { completeOnboarding } from '../commit';
import { NotificationHero } from '../NotificationHero';

/**
 * S12: the closing step of the conversation — the OS notification permission
 * ask (founder decision, 2026-07-30). It used to land on the first Home after
 * the paywall (11 §2); it now sits here, right after she picks an arrival time
 * (S11), so the ask reads as a reminder of what she just set up.
 *
 * This screen — not S11 — now finishes onboarding: it stamps completion and
 * hands off to the generation ritual (product 07 S12, 08 §1). It draws no
 * progress header (it carries no answer) and no edit-guard (nothing to revise
 * from a permission prompt).
 *
 * Enabling asks the OS and records the ask, so the post-paywall fallback on Home
 * stays quiet — she is never asked twice. "Maybe later" leaves it unrecorded, so
 * Home can still offer it on that first landing.
 */
export function S12Notifications() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    analytics.capture('onboarding_screen_viewed', { screen_id: 's12-notifications' });
  }, []);

  const finish = async (ask: boolean): Promise<void> => {
    if (busy || !userId) return;
    setBusy(true);
    void haptic('onboardingContinue');

    try {
      if (ask) {
        const { granted } = await requestPermissionAndRegister(userId);
        if (granted) {
          // She said yes — stamp completion and go straight into the ritual.
          // `replace`, so a back-swipe cannot reopen onboarding.
          markPermissionAsked(true);
          await completeOnboarding(userId);
          router.replace('/(onboarding)/generating');
          return;
        }
        // Declined at the OS level: one warm second chance (2026-08-10). Don't
        // mark asked or complete yet — S12b may still turn it on, and if she
        // continues from there it stamps completion itself.
        router.push('/(onboarding)/s12b-notifications');
        return;
      }

      // "Maybe later" — offer the value once more before finishing, rather than
      // silently dropping the whole daily loop.
      router.push('/(onboarding)/s12b-notifications');
    } finally {
      // Left un-busy on a sync failure so she can retry rather than stall.
      setBusy(false);
    }
  };

  // Centred beat (bell → line → note) rather than a top-aligned question over a
  // small block, so the closing ask reads full, not empty. No progress header and
  // no edit-guard on a permission prompt.
  return (
    <Screen testID="s12-notifications">
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <NotificationHero icon="notifications" />
        <View style={{ gap: spacing.sm }}>
          <SerifDisplay variant="question" center>
            {onboardingCopy.s12Notifications.question}
          </SerifDisplay>
          <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
            {onboardingCopy.s12Notifications.helper}
          </Text>
        </View>
        <Card variant="solid" style={{ backgroundColor: colors.accent.parchment }}>
          <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
            {onboardingCopy.s12Notifications.note}
          </Text>
        </Card>
      </View>

      <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
        <PillButton
          title={onboardingCopy.s12Notifications.primary}
          onPress={() => void finish(true)}
          disabled={busy}
        />
        <TextButton
          title={onboardingCopy.s12Notifications.skip}
          onPress={() => void finish(false)}
        />
      </View>
    </Screen>
  );
}
