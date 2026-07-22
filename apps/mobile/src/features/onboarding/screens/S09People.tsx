import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import type { DraftPerson } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { ReflectionBeat } from '../ReflectionBeat';
import { useConversation } from '../useConversation';

/** 3 at onboarding; more later in Profile (product 07 S9). */
const MAX_PEOPLE = 3;

/** V4 dashed add-row height — a row, not a full button; no token fits. */
const ADD_ROW_HEIGHT = 48;

/** Matches Card's dashed hairline weight. */
const DASH_WIDTH = 1.5;

/** V4 gives the one-word field slightly more room than the name. */
const DESCRIPTOR_FLEX = 1.3;

/**
 * S9: the strongest specificity token — the Letter names her people. "Just me
 * for now" is a fully supported path, not a failure state (the dignity rule):
 * the Letter adapts to self-focus, and nothing here nags about being alone.
 */
export function S09People() {
  const { colors, radii, spacing, typography } = useTheme();
  const { submit, existingValue } = useConversation('s09-people');

  const [people, setPeople] = useState<DraftPerson[]>(
    Array.isArray(existingValue) ? (existingValue as DraftPerson[]) : [],
  );
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [reflectionFor, setReflectionFor] = useState<string | null>(null);

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;

    setPeople((current) => [...current, { name: trimmed, descriptor: descriptor.trim() }]);
    setName('');
    setDescriptor('');
    // The beat proves listening: "{name}'s in. Your circle is forming."
    setReflectionFor(trimmed);
  };

  const canAddMore = people.length < MAX_PEOPLE;

  // A committed entry reads as the pair of fields it was typed into (v4 S9).
  const settledField = {
    flexGrow: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radii.field,
    padding: spacing.md,
  };

  return (
    <ConversationScreen
      testID="s09-people"
      screenId="s09-people"
      question={onboardingCopy.s09People.question}
      primaryTitle={onboardingCopy.s09People.primary}
      onPrimary={() => void submit(people)}
      primaryDisabled={people.length === 0}
      skipTitle={onboardingCopy.s09People.justMe}
      onSkip={() => void submit([], true)}
    >
      {people.map((person) => (
        <View key={person.name} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={[settledField, { flexBasis: 0, flex: 1 }]}>
            <Text style={[typography.body, { color: colors.text.primary }]}>{person.name}</Text>
          </View>
          <View style={[settledField, { flexBasis: 0, flex: DESCRIPTOR_FLEX }]}>
            <Text style={[typography.body, { color: colors.text.primary }]}>
              {person.descriptor}
            </Text>
          </View>
        </View>
      ))}

      {reflectionFor !== null && (
        <ReflectionBeat
          line={onboardingCopy.s09People.reflection.replace('{name}', reflectionFor)}
          holdMs={1200}
          onDone={() => setReflectionFor(null)}
        />
      )}

      {canAddMore && reflectionFor === null && (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flexBasis: 0, flex: 1 }}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder={onboardingCopy.s09People.namePlaceholder}
              />
            </View>
            <View style={{ flexBasis: 0, flex: DESCRIPTOR_FLEX }}>
              <Input
                value={descriptor}
                onChangeText={setDescriptor}
                placeholder={onboardingCopy.s09People.descriptorPlaceholder}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={onboardingCopy.s09People.addAnother}
            onPress={add}
            style={{
              minHeight: ADD_ROW_HEIGHT,
              borderWidth: DASH_WIDTH,
              borderStyle: 'dashed',
              borderColor: colors.accent.oliveFaint,
              borderRadius: radii.field,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[typography.button, { color: colors.text.label }]}>
              {onboardingCopy.s09People.addAnother}
            </Text>
          </Pressable>
        </View>
      )}
    </ConversationScreen>
  );
}
