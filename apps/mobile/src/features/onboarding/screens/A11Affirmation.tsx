import { useState } from 'react';
import { Text, View } from 'react-native';

import { PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

/**
 * A11 — the first value moment (merged from the Aura design). One gentle,
 * process-framed affirmation before any ask — a small felt payoff that proves
 * the ritual is worth three minutes. Carries no answer; "Show me another" cycles
 * the sample line, "This resonates" advances. New screen (no prior equivalent).
 */
export function A11Affirmation() {
  const { colors, spacing, typography } = useTheme();
  const { advance } = useConversation('a11-affirmation');
  const c = onboardingCopy.a11Affirmation;
  const [index, setIndex] = useState(0);

  return (
    <Screen testID="a11-affirmation">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Text
          style={[
            typography.label,
            { color: colors.text.secondary, letterSpacing: 2, textAlign: 'center' },
          ]}
        >
          {c.eyebrow}
        </Text>
        <SerifDisplay variant="affirmationHero" center>
          {c.affirmations[index % c.affirmations.length]}
        </SerifDisplay>
      </View>

      <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
        <PillButton title={c.primary} onPress={advance} />
        <TextButton
          title={c.another}
          onPress={() => setIndex((i) => (i + 1) % c.affirmations.length)}
        />
      </View>
    </Screen>
  );
}
