import { useState } from 'react';
import { Text, View } from 'react-native';

import { onboardingCopy, type TimeKey } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * Q11 — time and commitment. The implementation intention lives in the button
 * label: "I'll do this at 8:00am". Keys map to `arrival_time` presets in
 * commit.ts, and the time shown is that preset — the reminder never promises
 * a minute it won't keep.
 */
export function A08RitualTime() {
  const { colors, radii, shadows, spacing } = useTheme();
  const { submit, existingValue } = useConversation('a08-ritual-time');
  const c = onboardingCopy.a08RitualTime;
  const [selected, setSelected] = useState<TimeKey | null>(
    typeof existingValue === 'string' ? (existingValue as TimeKey) : null,
  );
  const choice = c.choices.find((t) => t.key === selected) ?? null;
  const time = (choice ?? c.choices[0]!).time;

  return (
    <ConversationScreen
      testID="a08-ritual-time"
      screenId="a08-ritual-time"
      question={c.question}
      primaryTitle={c.primary.replace('{time}', time)}
      onPrimary={() => selected && void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm + 1 }}>
        {c.choices.map((option) => (
          <AnswerRow
            key={option.key}
            label={option.label}
            selected={selected === option.key}
            onPress={() => setSelected(option.key)}
            testID={`a08-ritual-time-${option.key}`}
          />
        ))}
      </View>

      {/* The design's fine-tune row: the exact time the pick resolves to. */}
      <View
        style={{
          marginTop: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.md + 4,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.field,
          backgroundColor: colors.surface.cardGlassy,
          borderWidth: 1,
          borderColor: colors.surface.border,
          ...shadows.card,
        }}
      >
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.text.secondary }}>
          {c.fineTune}
        </Text>
        <Text
          allowFontScaling={false}
          style={{ fontFamily: fonts.serifSemiBold, fontSize: 26, color: colors.text.primary }}
        >
          {time}
        </Text>
      </View>
    </ConversationScreen>
  );
}
