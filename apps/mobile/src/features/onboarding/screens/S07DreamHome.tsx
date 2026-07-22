import { useState } from 'react';
import { View } from 'react-native';

import { SelectCard } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * S7: sensory concreteness feeds vivid moments (product 07). The card id is our
 * vocabulary, not hers — the seed stores it without a verbatim (09 §1), and the
 * soft line illustrations arrive with the asset pass (Phase 12).
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
      {/* V4: a two-column grid — eight homes scan as a spread, not a list. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {Object.entries(onboardingCopy.s07DreamHome.cards).map(([id, title]) => (
          <View key={id} style={{ flexBasis: '48%', flexGrow: 1 }}>
            <SelectCard title={title} selected={selected === id} onPress={() => setSelected(id)} />
          </View>
        ))}
      </View>
    </ConversationScreen>
  );
}
