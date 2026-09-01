import { useState } from 'react';
import { Text } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { primaryGoalOf } from '../flow';
import { useConversation } from '../useConversation';

/**
 * VALUE — your first one. A pre-written, process-framed line for her goal,
 * shown before any data has left the device. "Show me another" cycles the
 * bank; "This resonates" moves on. Carries no answer.
 */
export function A11Affirmation() {
  const { colors, spacing } = useTheme();
  const { advance } = useConversation('a11-affirmation');
  const answers = useOnboardingDraft((s) => s.answers);
  const c = onboardingCopy.a11Affirmation;
  const bank = c.bank[primaryGoalOf(answers)];
  const [reroll, setReroll] = useState(0);

  return (
    <ConversationScreen
      testID="a11-affirmation"
      screenId="a11-affirmation"
      center
      eyebrow={c.eyebrow}
      primaryTitle={c.primary}
      onPrimary={advance}
      secondaryTitle={c.another}
      onSecondary={() => setReroll((n) => n + 1)}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: fonts.serifSemiBold,
          fontSize: 40,
          lineHeight: 48,
          letterSpacing: -0.5,
          color: colors.text.primary,
          marginTop: -spacing.sm,
        }}
      >
        {`“${bank[reroll % bank.length]}”`}
      </Text>
    </ConversationScreen>
  );
}
