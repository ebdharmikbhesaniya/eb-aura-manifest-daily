import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, Sheet, TextButton, SerifDisplay } from '@/components';
import { authCopy } from '@/copy/auth';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { sendSignInLink, signInWithApple } from './session';

export interface SignInSheetProps {
  appleAvailable?: boolean;
  /**
   * True when this device already holds an unclaimed conversation worth losing.
   * Adds the replace warning — signing in abandons the anonymous account, and
   * she should read that before it happens, not after.
   */
  hasLocalWork?: boolean;
  /** Called once a session for the existing account is live. */
  onSignedIn: () => void;
  onDismiss: () => void;
}

/**
 * The sign-in sheet (03 §2.3).
 *
 * Same shape as the claim sheet on purpose — she is doing the recognisable
 * thing — but the mechanism underneath is the opposite one, and the copy says
 * so. See `session.ts` for why the two must never be merged.
 */
export const SignInSheet = forwardRef<BottomSheetModal, SignInSheetProps>(function SignInSheet(
  { appleAvailable = false, hasLocalWork = false, onSignedIn, onDismiss },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [sent, setSent] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [busy, setBusy] = useState(false);

  const runApple = async () => {
    setBusy(true);
    const result = await signInWithApple();
    setBusy(false);
    if (result.status === 'signed_in') onSignedIn();
  };

  const runEmail = async () => {
    setBusy(true);
    setUnknown(false);
    const { sent: ok } = await sendSignInLink(email.trim());
    setBusy(false);
    // The only expected failure is an address with no account behind it, which
    // `shouldCreateUser: false` turns into an error rather than a new account.
    if (ok) setSent(true);
    else setUnknown(true);
  };

  return (
    <Sheet ref={ref} snapPoints={['56%']}>
      <BottomSheetView
        style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
      >
        <SerifDisplay variant="sheetTitle">{authCopy.signIn.title}</SerifDisplay>

        <Text
          allowFontScaling={false}
          style={[scaledType('body', scale), { color: colors.text.secondary }]}
        >
          {authCopy.signIn.body}
        </Text>

        {hasLocalWork && !sent && (
          <Text
            testID="signin-replace-warning"
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {authCopy.signIn.replaceWarning}
          </Text>
        )}

        {sent ? (
          <Text
            testID="signin-email-sent"
            allowFontScaling={false}
            style={[scaledType('body', scale), { color: colors.text.primary }]}
          >
            {authCopy.signIn.emailSent}
          </Text>
        ) : showEmail ? (
          <View style={{ gap: spacing.sm }}>
            <Input
              inSheet
              value={email}
              onChangeText={setEmail}
              placeholder={authCopy.signIn.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="signin-email-input"
            />
            {unknown && (
              <Text
                testID="signin-email-unknown"
                allowFontScaling={false}
                style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
              >
                {authCopy.signIn.emailUnknown}
              </Text>
            )}
            <PillButton
              title={authCopy.signIn.email}
              onPress={() => void runEmail()}
              disabled={email.trim() === ''}
              loading={busy}
              testID="signin-email-submit"
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {appleAvailable && (
              <PillButton
                title={authCopy.signIn.apple}
                onPress={() => void runApple()}
                loading={busy}
                testID="signin-apple"
              />
            )}
            <OutlinePill
              title={authCopy.signIn.email}
              onPress={() => setShowEmail(true)}
              testID="signin-use-email"
            />
          </View>
        )}

        <View style={{ alignItems: 'center' }}>
          <TextButton title={authCopy.signIn.later} onPress={onDismiss} testID="signin-later" />
        </View>
      </BottomSheetView>
    </Sheet>
  );
});
