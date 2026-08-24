import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Input, Orb, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { authCopy } from '@/copy/auth';
import { EMAIL_AUTH_ENABLED } from '@/features/auth/emailAuthEnabled';
import { googleAuthAvailable, getGoogleIdToken } from '@/features/auth/google';
import { signInWithPassword, signUpWithPassword } from '@/features/auth/password';
import { authenticateWithProvider, sendSignInLink } from '@/features/auth/session';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { appleAuthAvailable } from '@/features/paywall/claim';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import * as AppleAuthentication from 'expo-apple-authentication';

/** Matches S1's hero orb — this screen took over as the first thing she sees. */
const GATE_ORB_SIZE = 140;

/**
 * The orb shrinks once the keyboard is up. At full size the form is pushed off
 * a short screen entirely, which is the bug this replaced: she tapped into the
 * password field and could no longer see it.
 */
const GATE_ORB_SIZE_COMPACT = 84;

/**
 * `(auth)/sign-in` — the gate (founder decision, 2026-07-24).
 *
 * This REVERSES the anonymous-first position the product shipped with (03 §2.1:
 * "no email, no signup, no wall"). Doc 03 has been rewritten to match rather
 * than left contradicting the code.
 *
 * The anonymous session still exists underneath: boot mints one so she has a
 * real user and real RLS from the first frame, and both `signUpWithPassword`
 * and `authenticateWithProvider` LINK her chosen identity to it. That is what
 * lets anyone part-way through the conversation keep everything.
 *
 * Email + password is the primary path (founder decision, 2026-07-25),
 * reversing doc 03 §6's no-password rule. The magic link stays as the way back
 * in for a forgotten password, which is why there is no reset form.
 */
type Mode = 'choose' | 'create' | 'signin';

export default function SignInRoute() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [google, setGoogle] = useState(false);
  const [apple, setApple] = useState(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  /**
   * WHICH action is in flight, not merely whether one is. A single shared
   * boolean put a spinner on every provider button at once, so tapping Google
   * also spun Apple — she cannot tell which sign-in she actually started, and
   * two spinners read as the app doing something it isn't.
   */
  const [pending, setPending] = useState<'google' | 'apple' | 'email' | null>(null);
  const busy = pending !== null;
  const [notice, setNotice] = useState<string | null>(null);

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
    setPending('google');
    setNotice(null);
    const token = await getGoogleIdToken();
    if (token.status !== 'ok') {
      setPending(null);
      // A cancel stays silent the first time — she meant it, and apologising for
      // her own decision is worse than saying nothing. But a REPEATED cancel is
      // how a dropped OAuth callback looks (see cancelStreak.ts), and leaving
      // that silent is what made a configuration bug read as "nothing happens".
      if (token.status === 'failed' || token.unexpected) setNotice(authCopy.gate.failed);
      return;
    }

    const outcome = await authenticateWithProvider('google', token.idToken);
    setPending(null);
    if (outcome.status === 'linked' || outcome.status === 'signed_in') proceed();
    else if (outcome.status === 'failed') setNotice(authCopy.gate.failed);
  }, [proceed]);

  const runApple = useCallback(async () => {
    setPending('apple');
    setNotice(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });

      if (!credential.identityToken) {
        setPending(null);
        setNotice(authCopy.gate.failed);
        return;
      }

      const outcome = await authenticateWithProvider('apple', credential.identityToken);
      setPending(null);
      if (outcome.status === 'linked' || outcome.status === 'signed_in') proceed();
      else if (outcome.status === 'failed') setNotice(authCopy.gate.failed);
    } catch (error) {
      setPending(null);
      // A dismissed Apple sheet is a decision, not an error to apologise for.
      if ((error as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') {
        setNotice(authCopy.gate.failed);
      }
    }
  }, [proceed]);

  /** The magic link, now reached only from "forgot your password". */
  const runEmailLink = useCallback(async () => {
    setPending('email');
    setNotice(null);
    const { sent: ok } = await sendSignInLink(email.trim());
    setPending(null);
    if (ok) setSent(true);
    else setNotice(authCopy.gate.failed);
  }, [email]);

  const runCreate = useCallback(async () => {
    setPending('email');
    setNotice(null);
    const outcome = await signUpWithPassword(email.trim(), password);
    setPending(null);

    switch (outcome.status) {
      case 'created':
        proceed();
        return;
      case 'confirm_email':
        setNotice(authCopy.gate.password.confirmEmail);
        return;
      case 'email_taken':
        // Move her to the door that will actually open, carrying the address.
        setMode('signin');
        setNotice(authCopy.gate.password.emailTaken);
        return;
      case 'weak_password':
        setNotice(outcome.reason);
        return;
      default:
        setNotice(authCopy.gate.failed);
    }
  }, [email, password, proceed]);

  const runSignIn = useCallback(async () => {
    setPending('email');
    setNotice(null);
    const outcome = await signInWithPassword(email.trim(), password);
    setPending(null);

    switch (outcome.status) {
      case 'signed_in':
        proceed();
        return;
      case 'wrong_credentials':
        setNotice(authCopy.gate.password.wrongCredentials);
        return;
      case 'unconfirmed':
        setNotice(authCopy.gate.password.unconfirmed);
        return;
      default:
        setNotice(authCopy.gate.failed);
    }
  }, [email, password, proceed]);

  // No anonymous session to wait on any more (03 §2.1 reversal): the gate is only
  // mounted once boot has routed here, and provider login ADOPTS an account
  // directly rather than linking onto an existing one, so nothing has to exist
  // first. The only thing that disables a button is an auth attempt in flight.
  const formMode = mode === 'create' || mode === 'signin';
  const canSubmit = email.trim() !== '' && password !== '' && !busy;

  // The choose screen keeps the welcome; the forms name what she is doing.
  const title =
    mode === 'choose'
      ? authCopy.gate.title
      : mode === 'signin'
        ? authCopy.gate.password.signInTitle
        : authCopy.gate.password.createTitle;
  const body =
    mode === 'choose'
      ? authCopy.gate.body
      : mode === 'signin'
        ? authCopy.gate.password.signInBody
        : authCopy.gate.password.createBody;

  return (
    <Screen testID="auth-sign-in">
      {/*
        `behavior="padding"` on BOTH platforms, deliberately. Android normally
        gets by on `adjustResize`, but this app sets `edgeToEdgeEnabled=true`
        (android/gradle.properties), and under edge-to-edge Android stops
        resizing the window for the IME — which is exactly why the password
        field sat underneath the keyboard with no way to see it.
      */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: formMode ? spacing.md : spacing.xl,
              paddingVertical: spacing.lg,
            }}
          >
            <Orb state="idle" size={formMode ? GATE_ORB_SIZE_COMPACT : GATE_ORB_SIZE} />
            <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
              <SerifDisplay variant="display" center>
                {title}
              </SerifDisplay>
              <Text
                allowFontScaling={false}
                style={[
                  scaledType('body', scale),
                  { color: colors.text.secondary, textAlign: 'center' },
                ]}
              >
                {body}
              </Text>
            </View>
          </View>

          <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
            {notice !== null && (
              <Text
                testID="auth-sign-in-notice"
                allowFontScaling={false}
                style={[
                  scaledType('bodySmall', scale),
                  { color: colors.text.secondary, textAlign: 'center' },
                ]}
              >
                {notice}
              </Text>
            )}

            {sent ? (
              <Text
                testID="auth-sign-in-sent"
                allowFontScaling={false}
                style={[
                  scaledType('body', scale),
                  { color: colors.text.primary, textAlign: 'center' },
                ]}
              >
                {authCopy.gate.emailSent}
              </Text>
            ) : formMode ? (
              <View style={{ gap: spacing.sm }}>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder={authCopy.gate.password.emailLabel}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  testID="auth-email-input"
                />
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder={authCopy.gate.password.passwordLabel}
                  autoCapitalize="none"
                  secureTextEntry
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    if (canSubmit) void (mode === 'create' ? runCreate() : runSignIn());
                  }}
                  {...(mode === 'create' && { hint: authCopy.gate.password.passwordHint })}
                  testID="auth-password-input"
                />
                <PillButton
                  title={
                    mode === 'create'
                      ? authCopy.gate.password.create
                      : authCopy.gate.password.signIn
                  }
                  onPress={() => void (mode === 'create' ? runCreate() : runSignIn())}
                  disabled={!canSubmit}
                  loading={pending === 'email'}
                  testID="auth-password-submit"
                />

                <View style={{ alignItems: 'center', gap: spacing.xs }}>
                  <TextButton
                    title={
                      mode === 'create'
                        ? authCopy.gate.password.haveAccount
                        : authCopy.gate.password.needAccount
                    }
                    onPress={() => {
                      setMode(mode === 'create' ? 'signin' : 'create');
                      setNotice(null);
                    }}
                    testID="auth-mode-swap"
                  />
                  {mode === 'signin' && (
                    <TextButton
                      title={authCopy.gate.password.forgot}
                      onPress={() => void runEmailLink()}
                      testID="auth-forgot-password"
                    />
                  )}
                  <TextButton
                    title={authCopy.gate.back}
                    onPress={() => {
                      setMode('choose');
                      setNotice(null);
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
                    icon={<Ionicons name="logo-google" size={20} color={colors.text.onCta} />}
                    onPress={() => void runGoogle()}
                    // `disabled` on ANY attempt so a second provider cannot race
                    // the first; `loading` only on this one, so the spinner marks
                    // the button she actually tapped.
                    disabled={busy}
                    loading={pending === 'google'}
                    testID="auth-google"
                  />
                )}
                {apple && (
                  <PillButton
                    title={authCopy.gate.apple}
                    icon={<Ionicons name="logo-apple" size={20} color={colors.text.onCta} />}
                    onPress={() => void runApple()}
                    disabled={busy}
                    loading={pending === 'apple'}
                    testID="auth-apple"
                  />
                )}
                {/*
                  Email auth (create account + sign in with email/password) is
                  disabled for launch — Google/Apple only. Gated behind
                  EMAIL_AUTH_ENABLED rather than deleted so the whole flow can be
                  restored by flipping that one flag. See emailAuthEnabled.ts.
                */}
                {EMAIL_AUTH_ENABLED && (
                  <>
                    <PillButton
                      title={authCopy.gate.password.create}
                      onPress={() => setMode('create')}
                      testID="auth-use-password"
                    />
                    <OutlinePill
                      title={authCopy.gate.password.signIn}
                      onPress={() => setMode('signin')}
                      testID="auth-use-email"
                    />
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
