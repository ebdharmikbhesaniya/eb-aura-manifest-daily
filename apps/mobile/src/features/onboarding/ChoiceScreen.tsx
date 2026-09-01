import type { Ionicons } from '@expo/vector-icons';
import type { OnboardingScreenId } from '@aura/shared';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from './AnswerRow';
import { ConversationScreen } from './ConversationScreen';
import { useConversation } from './useConversation';

/** The design's beat between a tap and the next screen — long enough to see the pick land. */
export const AUTO_ADVANCE_MS = 260;

export interface ChoiceOption {
  key: string;
  label: string;
  /** What is recorded. Defaults to the key; the obstacle records its label. */
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface ChoiceScreenProps {
  screenId: OnboardingScreenId;
  question: string;
  helper?: string;
  eyebrow?: string;
  options: readonly ChoiceOption[];
  /**
   * Single-select questions advance on their own (design v5): the tap IS the
   * Continue. Milliseconds before moving on; the mood and belief questions
   * linger longer so the answer registers before the screen changes.
   */
  autoAdvanceMs?: number;
  onSkip?: () => void;
  /** Runs after the pick and before the answer is submitted (priority reorders the goals). */
  beforeSubmit?: (value: string) => Promise<void> | void;
  footnote?: string;
  testID?: string;
}

/**
 * A single-select question: rows, one tap, a short pause, then on. Used for
 * priority, context, mood, obstacle, language, and calibration — the same
 * screen six times over, so the flow reads as one pattern.
 */
export function ChoiceScreen({
  screenId,
  question,
  helper,
  eyebrow,
  options,
  autoAdvanceMs = AUTO_ADVANCE_MS,
  onSkip,
  beforeSubmit,
  footnote,
  testID,
}: ChoiceScreenProps) {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation(screenId);
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );
  // The value already recorded is the one that stays lit on re-entry.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const pick = (option: ChoiceOption) => {
    const value = option.value ?? option.key;
    setSelected(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        await beforeSubmit?.(value);
        await submit(value);
      })();
    }, autoAdvanceMs);
  };

  return (
    <ConversationScreen
      {...(testID ? { testID } : {})}
      screenId={screenId}
      question={question}
      {...(helper !== undefined ? { helper } : {})}
      {...(eyebrow !== undefined ? { eyebrow } : {})}
      {...(onSkip ? { onSkip } : {})}
      {...(footnote !== undefined ? { footnote } : {})}
    >
      <View style={{ gap: spacing.sm + 2 }}>
        {options.map((option) => (
          <AnswerRow
            key={option.key}
            label={option.label}
            selected={selected === (option.value ?? option.key)}
            onPress={() => pick(option)}
            {...(option.icon ? { icon: option.icon } : {})}
            testID={`${screenId}-${option.key}`}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
