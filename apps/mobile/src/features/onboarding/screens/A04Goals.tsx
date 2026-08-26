import { useState } from 'react';
import { Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** ≤2 to match the `values` column's DB check (02 §1); a04 reuses that column. */
const MAX_GOALS = 2;

/**
 * A04 — goals (combined build): the funnel's goal quiz, now on the Redesign's
 * shared AnswerRow — full-width list rows with the design's glyph as a leading
 * tile, and a live n/2 counter. Answers persist to `values`.
 */
export function A04Goals() {
  const { colors, spacing, radii } = useTheme();
  const { submit, existingValue } = useConversation('a04-goals');
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(existingValue) ? (existingValue as string[]) : [],
  );

  const toggle = (label: string) => {
    setSelected((current) => {
      if (current.includes(label)) return current.filter((v) => v !== label);
      if (current.length >= MAX_GOALS) return [...current.slice(1), label];
      return [...current, label];
    });
  };

  return (
    <ConversationScreen
      testID="a04-goals"
      screenId="a04-goals"
      question={onboardingCopy.a04Goals.question}
      primaryTitle={onboardingCopy.a04Goals.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected.length === 0}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.sansMedium,
            fontSize: 13,
            color: colors.text.secondary,
          }}
        >
          {onboardingCopy.a04Goals.helper}
        </Text>
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: colors.accent.emberDeep,
            backgroundColor: colors.accent.parchment,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          {`${selected.length} / ${MAX_GOALS}`}
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {onboardingCopy.a04Goals.choices.map((choice) => {
          const on = selected.includes(choice.label);
          return (
            <AnswerRow
              key={choice.label}
              label={choice.label}
              selected={on}
              onPress={() => toggle(choice.label)}
              leading={
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radii.chip,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? 'rgba(245,242,232,0.16)' : colors.surface.divider,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      color: on ? colors.text.onCta : colors.accent.emberDeep,
                    }}
                  >
                    {choice.icon}
                  </Text>
                </View>
              }
            />
          );
        })}
      </View>
    </ConversationScreen>
  );
}
