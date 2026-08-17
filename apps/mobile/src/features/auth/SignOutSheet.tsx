import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, Sheet, TextButton, SerifDisplay } from '@/components';
import { authCopy } from '@/copy/auth';
import { paywallCopy } from '@/copy/paywall';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { claimWithApple, claimWithEmail } from '@/features/paywall/claim';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface SignOutSheetProps {
  /** Whether the account has an identity attached — see `isAccountClaimed`. */
  claimed: boolean;
  appleAvailable?: boolean;
  /** Confirmed: drop the session and wipe this device. */
  onSignOut: () => void;
  onDismiss: () => void;
}

/**
 * The sign-out sheet (03 §2.2, §5).
 *
 * Two sheets in one, because the same tap means two very different things:
 *
 *   - CLAIMED — a plain confirmation. Her account has a way back in, so this is
 *     ordinary and the copy stays light.
 *   - UNCLAIMED — a gate. This product boots everyone into an anonymous
 *     account, so signing out without an identity attached ends her letters
 *     permanently. She is offered the claim first, in the same sheet, so the
 *     safe path is the short one.
 *
 * "Sign out anyway" survives on the unclaimed side deliberately. It is her
 * account and her decision; product 15 bans dark patterns, and a door she
 * cannot walk through after being told the cost would be one.
 */
export const SignOutSheet = forwardRef<BottomSheetModal, SignOutSheetProps>(function SignOutSheet(
  { claimed, appleAvailable = false, onSignOut, onDismiss },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const runApple = async () => {
    setBusy(true);
    const result = await claimWithApple();
    setBusy(false);
    // Claimed here means the account now HAS a way back in, so signing out is
    // suddenly the safe, ordinary thing — carry her through it.
    if (result.status === 'claimed') onSignOut();
  };

  const runEmail = async () => {
    setBusy(true);
    const { sent: ok } = await claimWithEmail(email.trim());
    setBusy(false);
    setSent(ok);
  };

  return (
    <Sheet ref={ref} snapPoints={[claimed ? '38%' : '54%']}>
      <BottomSheetView
        style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
      >
        <SerifDisplay variant="sheetTitle">
          {claimed ? authCopy.signOut.confirmTitle : authCopy.signOut.unclaimedTitle}
        </SerifDisplay>

        <Text
          testID="signout-body"
          allowFontScaling={false}
          style={[scaledType('body', scale), { color: colors.text.secondary }]}
        >
          {claimed ? authCopy.signOut.confirmBody : authCopy.signOut.unclaimedBody}
        </Text>

        {claimed ? (
          <PillButton
            title={authCopy.signOut.confirm}
            onPress={onSignOut}
            testID="signout-confirm"
          />
        ) : sent ? (
          <Text
            testID="signout-claim-email-sent"
            allowFontScaling={false}
            style={[scaledType('body', scale), { color: colors.text.primary }]}
          >
            {paywallCopy.claim.emailSent}
          </Text>
        ) : showEmail ? (
          <View style={{ gap: spacing.sm }}>
            <Input
              inSheet
              value={email}
              onChangeText={setEmail}
              placeholder={paywallCopy.claim.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              // She is signing out with unclaimed letters — the one moment a
              // mistyped address costs her the account. Autofill it.
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={() => {
                if (email.trim() !== '') void runEmail();
              }}
              testID="signout-claim-email-input"
            />
            <PillButton
              title={paywallCopy.claim.email}
              onPress={() => void runEmail()}
              disabled={email.trim() === ''}
              loading={busy}
              testID="signout-claim-email-submit"
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {appleAvailable && (
              <PillButton
                title={paywallCopy.claim.apple}
                onPress={() => void runApple()}
                loading={busy}
                testID="signout-claim-apple"
              />
            )}
            <OutlinePill
              title={paywallCopy.claim.email}
              onPress={() => setShowEmail(true)}
              testID="signout-claim-use-email"
            />
          </View>
        )}

        <View style={{ alignItems: 'center' }}>
          {claimed ? (
            <TextButton
              title={authCopy.signOut.cancel}
              onPress={onDismiss}
              testID="signout-cancel"
            />
          ) : (
            <TextButton
              title={authCopy.signOut.anyway}
              onPress={onSignOut}
              destructive
              testID="signout-anyway"
            />
          )}
        </View>
      </BottomSheetView>
    </Sheet>
  );
});
