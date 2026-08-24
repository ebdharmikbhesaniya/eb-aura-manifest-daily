import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Screen, ScreenHeader } from '@/components';
import { settingsCopy } from '@/copy/settings';
import { SupportConnect } from '@/features/settings/SupportConnect';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `settings/support` (06 §1) — a pushed page from the Settings list. The form
 * needs the keyboard, so — like delete-account under edge-to-edge Android — it
 * rides a `KeyboardAvoidingView` or the field sits under the keyboard.
 */
export default function SupportRoute() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <Screen testID="support">
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.lg }}
        >
          <ScreenHeader
            title={settingsCopy.support.title}
            onBack={() => router.back()}
            testID="support-header"
          />
          <SupportConnect />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
