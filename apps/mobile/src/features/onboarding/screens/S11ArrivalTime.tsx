import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip, Label } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * Hour presets for "pick a time". A native wheel picker is a new native module
 * (dev-client rebuild) for one screen — hour granularity serves the arrival
 * cron's 15-minute windows fine (04 §5).
 */
const HOUR_CHOICES = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];

/**
 * S11 — the Onboarding Redesign: arrival presented as the same list-row idiom as
 * every other choice, with a leading time icon and a reason under each. The OS
 * permission is not asked here — it follows on s12-notifications, so choosing a
 * time and granting the permission stay two distinct beats.
 */
export function S11ArrivalTime() {
  const { colors, spacing, radii, typography } = useTheme();
  const { submit, existingValue } = useConversation('s11-arrival-time');

  const [choice, setChoice] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );
  const [showHours, setShowHours] = useState(false);

  const tile = (name: keyof typeof Ionicons.glyphMap, on: boolean) => (
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
      <Ionicons name={name} size={18} color={on ? colors.text.onCta : colors.text.label} />
    </View>
  );

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
        <AnswerRow
          label={onboardingCopy.s11ArrivalTime.morning}
          subtitle={onboardingCopy.s11ArrivalTime.morningHint}
          selected={choice === 'morning'}
          leading={tile('time-outline', choice === 'morning')}
          onPress={() => {
            setChoice('morning');
            setShowHours(false);
          }}
        />
        <AnswerRow
          label={onboardingCopy.s11ArrivalTime.evening}
          subtitle={onboardingCopy.s11ArrivalTime.eveningHint}
          selected={choice === 'evening'}
          leading={tile('moon-outline', choice === 'evening')}
          onPress={() => {
            setChoice('evening');
            setShowHours(false);
          }}
        />
        <AnswerRow
          label={onboardingCopy.s11ArrivalTime.pickTime}
          selected={showHours}
          trailing="chevron"
          leading={tile('ellipsis-horizontal', showHours)}
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
