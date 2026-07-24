import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Text, View } from 'react-native';

import { Input, PillButton, Screen, TextButton, ScreenHeader } from '@/components';
import { signOutAndWipeDevice } from '@/lib/accountReset';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';

/** She must type this exactly — a slip cannot delete an account (03 §5). */
const CONFIRM_WORD = 'delete';

/**
 * `settings/delete-account` (06 §1, 03 §5, product 18 "delete means delete").
 *
 * The endpoint has existed since Phase 2 and had no surface, which meant the
 * product promised a deletion path a user could not actually reach.
 *
 * The typed confirmation is the one place this product uses friction on
 * purpose: everything else is designed to get out of her way, and this is the
 * single irreversible action in the app.
 */
export default function DeleteAccountRoute() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <Screen testID="delete-account">
      {/*
        She has to type a confirmation word here, so the keyboard is not
        optional on this screen — and under `edgeToEdgeEnabled=true` Android
        stops honouring the manifest's adjustResize, which would leave the
        field and the Delete button beneath it.
      */}
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, gap: spacing.lg, paddingVertical: spacing.lg }}
      >
        <ScreenHeader
          title="Delete everything?"
          onBack={() => router.back()}
          testID="delete-account-header"
        />

        <Text style={[typography.body, { color: colors.text.secondary }]}>
          Your letter, your moments and everything you’ve told me. This can’t be undone, and I won’t
          keep a copy.
        </Text>

        <Input
          value={typed}
          onChangeText={setTyped}
          placeholder={`Type ${CONFIRM_WORD} to confirm`}
          autoCapitalize="none"
          testID="delete-confirm-input"
        />

        <PillButton
          title="Delete my account"
          disabled={!confirmed}
          loading={busy}
          onPress={() => {
            setBusy(true);
            void api
              .deleteAccount()
              // 03 §5 step 5 — the local half of "delete means delete". Without
              // it the next conversation resumed at her old screen, holding her
              // old answers, on a session whose user no longer exists.
              .then(() => signOutAndWipeDevice())
              // Back to the gate, not forward to the conversation. The account
              // this device held no longer exists, so the sign-in wall is the
              // honest next screen — routing straight to onboarding would start
              // her writing again with no account to own any of it.
              .then(() => router.replace('/'))
              .finally(() => setBusy(false));
          }}
          testID="delete-confirm"
        />

        <View style={{ alignItems: 'center' }}>
          <TextButton
            title="Keep my account"
            onPress={() => router.back()}
            testID="delete-cancel"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
