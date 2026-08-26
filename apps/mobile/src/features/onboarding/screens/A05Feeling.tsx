import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * A05 — feeling (combined build): the funnel quiz, now on the Redesign's shared
 * AnswerRow so it matches every other choice screen. Single choice; the KEY
 * persists to `profiles.feeling`, where 'anxious'/'stuck' are the gentle-content
 * router's triggers (safety, 03 §5).
 */
export function A05Feeling() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('a05-feeling');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="a05-feeling"
      screenId="a05-feeling"
      question={onboardingCopy.a05Feeling.question}
      helper={onboardingCopy.a05Feeling.helper}
      primaryTitle={onboardingCopy.a05Feeling.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {Object.entries(onboardingCopy.a05Feeling.choices).map(([value, label]) => (
          <AnswerRow
            key={value}
            label={label}
            selected={selected === value}
            onPress={() => setSelected(value)}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
