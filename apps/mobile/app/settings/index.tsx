import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { ScrollView } from 'react-native';

import { ListRow, RowGroup, Screen, ScreenHeader } from '@/components';
import { authCopy } from '@/copy/auth';
import { notificationsCopy } from '@/copy/notifications';
import { paywallCopy } from '@/copy/paywall';
import { settingsCopy } from '@/copy/settings';
import { googleAuthAvailable } from '@/features/auth/google';
import { SignInSheet } from '@/features/auth/SignInSheet';
import { SignOutSheet } from '@/features/auth/SignOutSheet';
import { useAccountStatus } from '@/features/auth/useAccountStatus';
import { LegalRowGroup } from '@/features/settings/LegalRowGroup';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { NotificationPrefsSheet } from '@/features/notifications/NotificationPrefsSheet';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { signOutAndWipeDevice } from '@/lib/accountReset';
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
  const signInRef = useRef<BottomSheetModal>(null);
  const signOutRef = useRef<BottomSheetModal>(null);

  // The paywall's copy of the claim sheet asks whether Apple is available;
  // Settings never did, so it fell back to the `true` default and offered
  // "Sign in with Apple" on Android, where the call cannot succeed — a dead
  // primary button on the one screen that promises her letters survive a new
  // phone.
  const { claimed, appleAvailable } = useAccountStatus();

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
        {/* Same gap Subscription had: pushed screens draw their own chrome, and
            nothing was drawing it — no title, no visible way back. */}
        <ScreenHeader
          title={settingsCopy.title}
          onBack={() => router.back()}
          testID="settings-header"
        />

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
          {/* Claiming is for the account she is ON; signing in is for one she
              already has elsewhere. Different rows because they are different
              acts — see features/auth/session.ts. */}
          <ListRow
            title={paywallCopy.claim.title}
            subtitle={settingsCopy.claim.subtitle}
            onPress={() => claimRef.current?.present()}
            testID="settings-claim-row"
          />
          {claimed === false && (
            <ListRow
              title={authCopy.signIn.action}
              subtitle={settingsCopy.signIn.subtitle}
              onPress={() => signInRef.current?.present()}
              testID="settings-signin-row"
            />
          )}
          {/* Held until the claim check settles: the subtitle promises she can
              come back, and that promise is only true for a claimed account. */}
          {claimed !== undefined && (
            <ListRow
              title={authCopy.signOut.title}
              subtitle={
                claimed ? authCopy.signOut.subtitleClaimed : authCopy.signOut.subtitleUnclaimed
              }
              onPress={() => signOutRef.current?.present()}
              testID="settings-signout-row"
            />
          )}
          <ListRow
            title={settingsCopy.deleteAccount}
            destructive
            trailing={null}
            onPress={() => router.push('/settings/delete-account')}
            testID="settings-delete-row"
          />
        </RowGroup>

        <LegalRowGroup />
      </ScrollView>

      <NotificationPrefsSheet ref={prefsRef} />
      <ClaimSheet
        ref={claimRef}
        appleAvailable={appleAvailable}
        onDone={() => claimRef.current?.dismiss()}
      />
      <SignInSheet
        ref={signInRef}
        appleAvailable={appleAvailable}
        googleAvailable={googleAuthAvailable()}
        hasLocalWork
        onSignedIn={() => {
          signInRef.current?.dismiss();
          // The boot gate re-routes off the new session; going Home directly
          // would render the previous account's shell for a frame.
          router.replace('/');
        }}
        onDismiss={() => signInRef.current?.dismiss()}
      />
      <SignOutSheet
        ref={signOutRef}
        claimed={claimed === true}
        appleAvailable={appleAvailable}
        onSignOut={() => {
          signOutRef.current?.dismiss();
          void signOutAndWipeDevice().then(() => router.replace('/'));
        }}
        onDismiss={() => signOutRef.current?.dismiss()}
      />
    </Screen>
  );
}
