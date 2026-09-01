import { useState } from 'react';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { useAppState } from '@/stores/appState';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * VALUE — the first gratitude entry. Seeds the journal before the money ask
 * (the IKEA effect): the entry is saved through the real, local-first
 * gratitude path AND recorded as an answer, so Day 1 already has "1 of 4"
 * done. Skippable.
 */
export function VGratitude() {
  const userId = useAppState((s) => s.userId);
  const { submit, skip, existingValue } = useConversation('v-gratitude');
  const gratitude = useGratitude(userId ?? undefined);
  const c = onboardingCopy.vGratitude;
  const [entry, setEntry] = useState(typeof existingValue === 'string' ? existingValue : '');

  const save = async () => {
    const trimmed = entry.trim();
    if (trimmed === '') return;
    gratitude.save(trimmed, c.question, false);
    await submit(trimmed);
  };

  return (
    <ConversationScreen
      testID="v-gratitude"
      screenId="v-gratitude"
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => void save()}
      primaryDisabled={entry.trim() === ''}
      secondaryTitle={c.skip}
      onSecondary={() => void skip()}
    >
      <Input
        value={entry}
        onChangeText={setEntry}
        placeholder={c.placeholder}
        multiline
        autoFocus
      />
    </ConversationScreen>
  );
}
