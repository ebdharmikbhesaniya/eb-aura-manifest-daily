import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, Orb, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { authCopy } from '@/copy/auth';
import { googleAuthAvailable, getGoogleIdToken } from '@/features/auth/google';
import { authenticateWithProvider, sendSignInLink } from '@/features/auth/session';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { appleAuthAvailable } from '@/features/paywall/claim';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import * as AppleAuthentication from 'expo-apple-authentication';

/** Matches S1's hero orb — this screen took over as the first thing she sees. */
const GATE_ORB_SIZE = 140;

/**
 * `(auth)/sign-in` — the gate (founder decision, 2026-07-24).
 *
 * This REVERSES the anonymous-first position the product shipped with (03 §2.1:
 * "no email, no signup, no wall"). Doc 03 has been rewritten to match rather
 * than left contradicting the code.
 *
 * The anonymous session still exists underneath: boot mints one so she has a
 * real user and real RLS from the first frame, and `authenticateWithProvider`
 * LINKS her chosen identity to it. That is what lets anyone who was part-way
 * through the conversation before this screen existed keep everything.
 *
 * No password field anywhere, which is doc 03 §6's rule and worth keeping:
 * nothing to breach, nothing to reset.
 */
export default function SignInRoute() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  const userId = useAppState((s) => s.userId);

  const [google, setGoogle] = useState(false);
  const [apple, setApple] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setGoogle(googleAuthAvailable());
    void appleAuthAvailable().then(setApple);
  }, []);

  /**
   * Back to the boot gate rather than forward to onboarding: she may be a
   * returning user whose account is already past it, and only the gate knows.
   */
  const proceed = useCallback(() => router.replace('/'), [router]);

  const runGoogle = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const token = await getGoogleIdToken();
    if (token.status !== 'ok') {
      setBusy(false);
      if (token.status === 'failed') setFailed(true);
      return;
    }

    const outcome = await authenticateWithProvider('google', token.idToken);
    setBusy(false);
    if (outcome.status === 'linked' || outcome.status === 'signed_in') proceed();
    else if (outcome.status === 'failed') setFailed(true);
  }, [proceed]);

  const runApple = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });

      if (!credential.identityToken) {
        setBusy(false);
        setFailed(true);
        return;
      }

      const outcome = await authenticateWithProvider('apple', credential.identityToken);
      setBusy(false);
      if (outcome.status === 'linked' || outcome.status === 'signed_in') proceed();
      else if (outcome.status === 'failed') setFailed(true);
    } catch (error) {
      setBusy(false);
      // A dismissed Apple sheet is a decision, not an error to apologise for.
      if ((error as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') setFailed(true);
    }
  }, [proceed]);

  const runEmail = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const { sent: ok } = await sendSignInLink(email.trim());
    setBusy(false);
    if (ok) setSent(true);
    else setFailed(true);
  }, [email]);

  // The buttons act on the anonymous session boot creates, so they cannot run
  // before it exists. The gate is only reachable once boot is ready, so this is
  // a guard rather than a state she will sit in.
  const ready = userId !== null;

  return (
    <Screen testID="auth-sign-in">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <Orb state="idle" size={GATE_ORB_SIZE} />
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <SerifDisplay variant="display" center>
            {authCopy.gate.title}
          </SerifDisplay>
          <Text
            allowFontScaling={false}
            style={[
              scaledType('body', scale),
              { color: colors.text.secondary, textAlign: 'center' },
            ]}
          >
            {authCopy.gate.body}
          </Text>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
        {failed && (
          <Text
            testID="auth-sign-in-failed"
            allowFontScaling={false}
            style={[
              scaledType('bodySmall', scale),
              { color: colors.text.secondary, textAlign: 'center' },
            ]}
          >
            {authCopy.gate.failed}
          </Text>
        )}

        {sent ? (
          <Text
            testID="auth-sign-in-sent"
            allowFontScaling={false}
            style={[scaledType('body', scale), { color: colors.text.primary, textAlign: 'center' }]}
          >
            {authCopy.gate.emailSent}
          </Text>
        ) : showEmail ? (
          <View style={{ gap: spacing.sm }}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={authCopy.gate.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="auth-email-input"
            />
            <PillButton
              title={authCopy.gate.emailSend}
              onPress={() => void runEmail()}
              disabled={!ready || email.trim() === ''}
              loading={busy}
              testID="auth-email-submit"
            />
            <View style={{ alignItems: 'center' }}>
              <TextButton
                title={authCopy.gate.back}
                onPress={() => {
                  setShowEmail(false);
                  setFailed(false);
                }}
                testID="auth-email-back"
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {google && (
              <PillButton
                title={authCopy.gate.google}
                onPress={() => void runGoogle()}
                disabled={!ready}
                loading={busy}
                testID="auth-google"
              />
            )}
            {apple && (
              <PillButton
                title={authCopy.gate.apple}
                onPress={() => void runApple()}
                disabled={!ready}
                loading={busy}
                testID="auth-apple"
              />
            )}
            <OutlinePill
              title={authCopy.gate.email}
              onPress={() => setShowEmail(true)}
              testID="auth-use-email"
            />
            <Text
              allowFontScaling={false}
              style={[
                scaledType('bodySmall', scale),
                { color: colors.text.secondary, textAlign: 'center' },
              ]}
            >
              {authCopy.gate.noPassword}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
