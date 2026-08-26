import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * A06 — obstacle (combined build): the funnel quiz on the shared AnswerRow.
 * Single choice; the readable LABEL persists to `struggle` (free text the memory
 * seed and the Letter read), so it submits the label, not a slug.
 */
export function A06Obstacle() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('a06-obstacle');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="a06-obstacle"
      screenId="a06-obstacle"
      question={onboardingCopy.a06Obstacle.question}
      helper={onboardingCopy.a06Obstacle.helper}
      primaryTitle={onboardingCopy.a06Obstacle.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {onboardingCopy.a06Obstacle.choices.map((label) => (
          <AnswerRow
            key={label}
            label={label}
            selected={selected === label}
            onPress={() => setSelected(label)}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
