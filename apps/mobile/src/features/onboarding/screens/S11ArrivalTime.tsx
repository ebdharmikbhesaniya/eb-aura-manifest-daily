import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip, Label } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { ArrivalChoiceCard } from '../ArrivalChoiceCard';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * Hour presets for "pick a time". A native wheel picker is a new native module
 * (dev-client rebuild) for one screen — hour granularity serves the arrival
 * cron's 15-minute windows fine (04 §5). Deviation noted in the plan; a wheel
 * can replace this row in Phase 12 polish without touching the data shape.
 */
const HOUR_CHOICES = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];

/**
 * S11: the reminder-in-onboarding lever (product 07 — Calm's 3× retention move).
 * The OS notification permission is not asked on THIS screen — it follows on
 * the next one (s12-notifications, the closing step) so choosing a time and
 * granting the permission stay two distinct beats rather than one loaded moment.
 *
 * V4 dress: Morning/Evening as choice cards with a reason under each, a
 * disclosure row for the hour presets, and the anti-nag promise on parchment.
 */
export function S11ArrivalTime() {
  const { colors, spacing, typography } = useTheme();
  const { submit, existingValue } = useConversation('s11-arrival-time');

  const [choice, setChoice] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );
  const [showHours, setShowHours] = useState(false);

  return (
    <ConversationScreen
      testID="s11-arrival-time"
      screenId="s11-arrival-time"
      question={onboardingCopy.s11ArrivalTime.question}
      primaryTitle={onboardingCopy.s11ArrivalTime.primary}
      onPrimary={() => void submit(choice)}
      primaryDisabled={choice === null}
    >
      <View style={{ gap: spacing.sm }}>
        <ArrivalChoiceCard
          title={onboardingCopy.s11ArrivalTime.morning}
          subtitle={onboardingCopy.s11ArrivalTime.morningHint}
          selected={choice === 'morning'}
          onPress={() => {
            setChoice('morning');
            setShowHours(false);
          }}
        />
        <ArrivalChoiceCard
          title={onboardingCopy.s11ArrivalTime.evening}
          subtitle={onboardingCopy.s11ArrivalTime.eveningHint}
          selected={choice === 'evening'}
          onPress={() => {
            setChoice('evening');
            setShowHours(false);
          }}
        />
        <ArrivalChoiceCard
          title={onboardingCopy.s11ArrivalTime.pickTime}
          selected={showHours}
          chevron
          onPress={() => setShowHours(true)}
        />
      </View>

      {showHours && (
        <View style={{ gap: spacing.sm }}>
          <Label>PICK AN HOUR</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {HOUR_CHOICES.map((hour) => (
              <Chip
                key={hour}
                label={hour}
                selected={choice === hour}
                onPress={() => setChoice(hour)}
              />
            ))}
          </View>
        </View>
      )}

      <Card variant="solid" style={{ backgroundColor: colors.accent.parchment }}>
        <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
          {onboardingCopy.s11ArrivalTime.note}
        </Text>
      </Card>
    </ConversationScreen>
  );
}
