import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** A leading glyph per time of day. */
const TIME_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  morning: 'partly-sunny-outline',
  lunch: 'sunny-outline',
  evening: 'moon-outline',
  'before-bed': 'bed-outline',
};

/**
 * A08 — ritual time (combined build): the funnel's preset picker on the shared
 * AnswerRow, with a leading time icon and the window as a subtitle. The KEY maps
 * to `arrival_time` via ARRIVAL_PRESETS (commit.ts), which drives the daily
 * notification schedule.
 */
export function A08RitualTime() {
  const { colors, spacing, radii } = useTheme();
  const { submit, existingValue } = useConversation('a08-ritual-time');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="a08-ritual-time"
      screenId="a08-ritual-time"
      question={onboardingCopy.a08RitualTime.question}
      helper={onboardingCopy.a08RitualTime.helper}
      primaryTitle={onboardingCopy.a08RitualTime.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {Object.entries(onboardingCopy.a08RitualTime.choices).map(([value, opt]) => {
          const on = selected === value;
          return (
            <AnswerRow
              key={value}
              label={opt.label}
              subtitle={opt.meta}
              selected={on}
              onPress={() => setSelected(value)}
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
                  <Ionicons
                    name={TIME_ICON[value] ?? 'time-outline'}
                    size={18}
                    color={on ? colors.text.onCta : colors.text.label}
                  />
                </View>
              }
            />
          );
        })}
      </View>
    </ConversationScreen>
  );
}
