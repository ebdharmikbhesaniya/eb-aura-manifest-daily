import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';

import { Card } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import {
  registerToken,
  requestPermissionAndRegister,
} from '@/features/notifications/useNotifications';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';

import { completeOnboarding } from '../commit';
import { ConversationScreen } from '../ConversationScreen';
import { NotificationHero } from '../NotificationHero';

/**
 * S12b — the notification second chance (founder decision, 2026-08-10).
 *
 * Shown ONCE, only when she declined the OS prompt or chose "Maybe later" on
 * S12. It names the concrete loss — the moment sits unseen without a reminder —
 * and offers to turn it on again. It is a warm second offer, never a guilt
 * screen: "Continue without them" is always right there, and it is never shown
 * a third time (this is the last notification ask in the funnel).
 *
 * The OS will not re-show its prompt once she has denied it, so on that path the
 * primary opens the system Settings; an AppState listener catches her return and
 * finishes if she flipped the switch there.
 *
 * Like S12, THIS screen finishes onboarding: it stamps completion and hands off
 * to the generation ritual on every exit.
 */
export function S12NotificationsMore() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);
  const [busy, setBusy] = useState(false);
  // Drives the primary label: a fresh "Maybe later" can still be prompted; an
  // OS-level denial cannot, so we send her to Settings instead.
  const [canAskAgain, setCanAskAgain] = useState(true);
  const proceeding = useRef(false);

  useEffect(() => {
    analytics.capture('notification_second_chance_viewed', {});
    void Notifications.getPermissionsAsync().then((p) => setCanAskAgain(p.canAskAgain));
  }, []);

  const proceed = useCallback(async (): Promise<void> => {
    if (proceeding.current || !userId) return;
    proceeding.current = true;
    try {
      // She has now been asked as far as we will ever ask — record it so Home's
      // fallback stays quiet (the weekly denied hint is still allowed).
      markPermissionAsked(true);
      await completeOnboarding(userId);
      router.replace('/(onboarding)/generating');
    } catch {
      // Leave her able to retry rather than stranded on a stamped-but-not-routed
      // state (mirrors S12's un-busy-on-failure).
      proceeding.current = false;
    }
  }, [router, userId]);

  // If she leaves for Settings, enables notifications, and comes back, register
  // the device and finish — so the trip to Settings is not a dead end.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !userId) return;
      void Notifications.getPermissionsAsync().then(async (p) => {
        if (p.status === 'granted') {
          await registerToken(userId);
          void proceed();
        } else {
          setCanAskAgain(p.canAskAgain);
        }
      });
    });
    return () => sub.remove();
  }, [userId, proceed]);

  const onPrimary = async (): Promise<void> => {
    if (busy || !userId) return;
    setBusy(true);
    void haptic('onboardingContinue');
    try {
      const perms = await Notifications.getPermissionsAsync();
      if (perms.status === 'granted') {
        await registerToken(userId);
        await proceed();
        return;
      }
      if (perms.canAskAgain) {
        // Never OS-prompted yet (she came via "Maybe later") — ask now.
        await requestPermissionAndRegister(userId);
        await proceed();
        return;
      }
      // Already denied at the OS level — the only way on is Settings. Stay on
      // the screen; the AppState listener finishes if she enables it there, and
      // "Continue without them" is still available.
      await Linking.openSettings();
    } finally {
      setBusy(false);
    }
  };

  const onSkip = (): void => {
    void haptic('onboardingContinue');
    void proceed();
  };

  const c = onboardingCopy.s12NotificationsMore;

  return (
    <ConversationScreen
      testID="s12b-notifications"
      // No progress header (carries no answer) and no edit-guard on a permission
      // prompt — same as S12.
      showEditGuard={false}
      question={c.question}
      helper={c.helper}
      primaryTitle={canAskAgain ? c.primary : c.openSettings}
      onPrimary={() => void onPrimary()}
      primaryDisabled={busy}
      skipTitle={c.skip}
      onSkip={onSkip}
    >
      <View style={{ gap: spacing.xl, paddingTop: spacing.sm }}>
        <NotificationHero icon="heart-outline" />
        <Card variant="solid" style={{ backgroundColor: colors.accent.parchment }}>
          <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>{c.note}</Text>
        </Card>
      </View>
    </ConversationScreen>
  );
}
