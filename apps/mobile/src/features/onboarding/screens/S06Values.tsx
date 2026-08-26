import { useState } from 'react';
import { Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** ≤2, and the DB check agrees (02 §1). Naming values is itself affirming (Steele). */
const MAX_VALUES = 2;

/**
 * S6 — the Onboarding Redesign: values as full-width list rows (was chips), with
 * a live `n / 2` counter beside the helper. At the cap a new pick replaces the
 * oldest — friendlier than a dead tap.
 */
export function S06Values() {
  const { colors, spacing } = useTheme();
  const { submit, existingValue } = useConversation('s06-values');
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(existingValue) ? (existingValue as string[]) : [],
  );

  const toggle = (value: string) => {
    setSelected((current) => {
      if (current.includes(value)) return current.filter((v) => v !== value);
      if (current.length >= MAX_VALUES) return [...current.slice(1), value];
      return [...current, value];
    });
  };

  return (
    <ConversationScreen
      testID="s06-values"
      screenId="s06-values"
      question={onboardingCopy.s06Values.question}
      primaryTitle={onboardingCopy.s06Values.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected.length === 0}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 }}>
        <Text
          style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text.secondary }}
        >
          {onboardingCopy.s06Values.helper}
        </Text>
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: colors.accent.emberDeep,
            backgroundColor: colors.accent.parchment,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            borderRadius: radiusPill,
            overflow: 'hidden',
          }}
        >
          {`${selected.length} / ${MAX_VALUES}`}
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {onboardingCopy.s06Values.choices.map((label) => (
          <AnswerRow
            key={label}
            label={label}
            selected={selected.includes(label)}
            onPress={() => toggle(label)}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}

const radiusPill = 999;
