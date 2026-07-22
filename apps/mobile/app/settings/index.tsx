import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { ScrollView } from 'react-native';

import { ListRow, RowGroup, Screen } from '@/components';
import { notificationsCopy } from '@/copy/notifications';
import { paywallCopy } from '@/copy/paywall';
import { settingsCopy } from '@/copy/settings';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { NotificationPrefsSheet } from '@/features/notifications/NotificationPrefsSheet';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `settings/index` — reached from the gear on Profile (06 §7: the gear lives on
 * Profile, never on Home). V4 "no mazes": two grouped cards, every row telling
 * her what's behind it before she taps.
 *
 * Group 1 is how the app behaves day to day; group 2 is her account — with
 * "manage or cancel" still two taps from anywhere (checklist #5), claiming an
 * account offered here as its second entry point (03 §89), and delete last.
 */
export default function SettingsRoute() {
  const router = useRouter();
  const { spacing } = useTheme();
  const claimRef = useRef<BottomSheetModal>(null);
  const prefsRef = useRef<BottomSheetModal>(null);

  const { premium, inTrial } = useEntitlement();
  const subscriptionSubtitle = premium
    ? inTrial
      ? paywallCopy.subscription.trial
      : paywallCopy.subscription.premium
    : paywallCopy.subscription.free;

  return (
    <Screen testID="settings">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: spacing.xl, gap: spacing.md }}
      >
        <RowGroup separatorInset="edge">
          <ListRow
            title={notificationsCopy.prefs.title}
            subtitle={settingsCopy.notifications.subtitle}
            onPress={() => prefsRef.current?.present()}
            testID="settings-notifications-row"
          />
        </RowGroup>

        <RowGroup separatorInset="edge">
          <ListRow
            title={paywallCopy.subscription.title}
            subtitle={subscriptionSubtitle}
            onPress={() => router.push('/settings/subscription')}
            testID="settings-subscription-row"
          />
          <ListRow
            title={paywallCopy.claim.title}
            subtitle={settingsCopy.claim.subtitle}
            onPress={() => claimRef.current?.present()}
            testID="settings-claim-row"
          />
          <ListRow
            title={settingsCopy.deleteAccount}
            destructive
            trailing={null}
            onPress={() => router.push('/settings/delete-account')}
            testID="settings-delete-row"
          />
        </RowGroup>
      </ScrollView>

      <NotificationPrefsSheet ref={prefsRef} />
      <ClaimSheet ref={claimRef} onDone={() => claimRef.current?.dismiss()} />
    </Screen>
  );
}
