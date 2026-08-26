import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * S5 — the Onboarding Redesign presents every choice as a full-width list row
 * (was chips). A low-effort beat between free-texts (product 07); it plants the
 * change narrative the Letter contrasts against ("the work you do now").
 */
export function S05WorkFeeling() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('s05-work-feeling');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="s05-work-feeling"
      screenId="s05-work-feeling"
      question={onboardingCopy.s05WorkFeeling.question}
      primaryTitle={onboardingCopy.s05WorkFeeling.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {Object.entries(onboardingCopy.s05WorkFeeling.choices).map(([value, label]) => (
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
