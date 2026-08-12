import { Ionicons } from '@expo/vector-icons';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, Sheet, TextButton, SerifDisplay } from '@/components';
import { authCopy } from '@/copy/auth';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { EMAIL_AUTH_ENABLED } from './emailAuthEnabled';
import { getGoogleIdToken } from './google';
import { authenticateWithProvider, sendSignInLink, signInWithApple } from './session';

export interface SignInSheetProps {
  appleAvailable?: boolean;
  /** Google is the Android half of provider sign-in — Apple covers iOS. */
  googleAvailable?: boolean;
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
  { appleAvailable = false, googleAvailable = false, hasLocalWork = false, onSignedIn, onDismiss },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [sent, setSent] = useState(false);
  const [unknown, setUnknown] = useState(false);
  /**
   * WHICH action is in flight, not merely whether one is. A shared boolean put a
   * spinner on every button at once, so tapping Google also spun Apple.
   */
  const [pending, setPending] = useState<'google' | 'apple' | 'email' | null>(null);
  const busy = pending !== null;
  /**
   * Provider sign-in used to fail completely silently here — the sheet just went
   * un-busy and sat there. `authCopy.gate.failed` is reused rather than
   * duplicated: it is surface-agnostic wording and already in the audited copy
   * catalog, so there is one string for "auth did not go through", not two.
   */
  const [notice, setNotice] = useState<string | null>(null);

  const runApple = async () => {
    setPending('apple');
    setNotice(null);
    const result = await signInWithApple();
    setPending(null);
    if (result.status === 'signed_in') onSignedIn();
    else if (result.status === 'failed') setNotice(authCopy.gate.failed);
  };

  const runGoogle = async () => {
    setPending('google');
    setNotice(null);
    const token = await getGoogleIdToken();
    if (token.status !== 'ok') {
      setPending(null);
      // Silent on a first cancel, loud on a repeat — see cancelStreak.ts.
      if (token.status === 'failed' || token.unexpected) setNotice(authCopy.gate.failed);
      return;
    }
    // `authenticateWithProvider` links to the account on this device when it can
    // and only signs in as an existing one when the identity is already taken —
    // the same keep-her-data-first order the gate uses (see session.ts).
    const outcome = await authenticateWithProvider('google', token.idToken);
    setPending(null);
    if (outcome.status === 'linked' || outcome.status === 'signed_in') onSignedIn();
    else if (outcome.status === 'failed') setNotice(authCopy.gate.failed);
  };

  const runEmail = async () => {
    setPending('email');
    setUnknown(false);
    const { sent: ok } = await sendSignInLink(email.trim());
    setPending(null);
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
              disabled={email.trim() === '' || busy}
              loading={pending === 'email'}
              testID="signin-email-submit"
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {notice !== null && (
              <Text
                testID="signin-notice"
                allowFontScaling={false}
                style={[
                  scaledType('bodySmall', scale),
                  { color: colors.text.secondary, textAlign: 'center' },
                ]}
              >
                {notice}
              </Text>
            )}
            {googleAvailable && (
              <PillButton
                title={authCopy.signIn.google}
                icon={<Ionicons name="logo-google" size={20} color={colors.text.onCta} />}
                onPress={() => void runGoogle()}
                // `disabled` on ANY attempt so a second provider cannot race the
                // first; `loading` only on this one, so the spinner marks the
                // button she actually tapped.
                disabled={busy}
                loading={pending === 'google'}
                testID="signin-google"
              />
            )}
            {appleAvailable && (
              <PillButton
                title={authCopy.signIn.apple}
                icon={<Ionicons name="logo-apple" size={20} color={colors.text.onCta} />}
                onPress={() => void runApple()}
                disabled={busy}
                loading={pending === 'apple'}
                testID="signin-apple"
              />
            )}
            {/* Email (magic-link) sign-in disabled for launch — Google/Apple
                only. Gated, not deleted; flip EMAIL_AUTH_ENABLED to restore. */}
            {EMAIL_AUTH_ENABLED && (
              <OutlinePill
                title={authCopy.signIn.email}
                onPress={() => setShowEmail(true)}
                testID="signin-use-email"
              />
            )}
          </View>
        )}

        <View style={{ alignItems: 'center' }}>
          <TextButton title={authCopy.signIn.later} onPress={onDismiss} testID="signin-later" />
        </View>
      </BottomSheetView>
    </Sheet>
  );
});
