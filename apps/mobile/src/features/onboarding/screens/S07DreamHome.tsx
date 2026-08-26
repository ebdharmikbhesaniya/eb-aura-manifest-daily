import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * S7 — the Onboarding Redesign presents the eight homes as full-width list rows
 * (was a two-column card grid), so it reads with the same idiom as every other
 * choice screen. The card id is our vocabulary, not hers — the seed stores it
 * without a verbatim (09 §1).
 */
export function S07DreamHome() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('s07-dream-home');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="s07-dream-home"
      screenId="s07-dream-home"
      question={onboardingCopy.s07DreamHome.question}
      primaryTitle={onboardingCopy.s07DreamHome.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {Object.entries(onboardingCopy.s07DreamHome.cards).map(([id, title]) => (
          <AnswerRow
            key={id}
            label={title}
            selected={selected === id}
            onPress={() => setSelected(id)}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
