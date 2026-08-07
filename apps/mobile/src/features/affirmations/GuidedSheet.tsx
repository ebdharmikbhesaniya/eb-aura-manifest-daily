import { BottomSheetScrollView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Chip, Input, PillButton, SerifDisplay } from '@/components';
import { Sheet } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export type GuidedStep = 'goal' | 'candidates';

export interface GuidedCandidate {
  id: string;
  text: string;
  whyLine: string | null;
}

export interface GuidedSheetProps {
  step: GuidedStep;
  candidates: GuidedCandidate[];
  busy?: boolean;
  /**
   * An in-voice line when the pass could not produce anything (07 §5).
   *
   * A guided generation is accepted asynchronously, so a QA rejection lands
   * after the sheet has already moved to the candidate step — leaving a title
   * over an empty panel with nothing to tap. The line is what turns that dead
   * end back into a step she can act from.
   */
  error?: string | null;
  onGenerate: (input: { goalArea: string; goalText?: string }) => void;
  onKeep: (candidateId: string) => void;
}

/**
 * The guided studio (product 09 §9.3b).
 *
 * One question — what it is for — then three candidates each carrying its own
 * why-line, the education layer no competitor has. The "how do you want to feel"
 * and "how should it sound" steps were removed (2026-07-30). The goal is kept in
 * sheet state rather than a store on purpose: product 09's edge case says an
 * abandoned flow keeps its draft for the SESSION, not forever, and sheet state
 * expresses that exactly without anything to clean up.
 *
 * There is deliberately no "regenerate": one set per pass is the documented cost
 * cap, and three candidates is already three generations.
 */
export const GuidedSheet = forwardRef<BottomSheetModal, GuidedSheetProps>(function GuidedSheet(
  { step, candidates, busy = false, error = null, onGenerate, onKeep },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [goalArea, setGoalArea] = useState<string | null>(null);
  const [goalText, setGoalText] = useState('');

  const label = (text: string) => <SerifDisplay variant="title">{text}</SerifDisplay>;

  return (
    // The candidate step stacks three cards with why-lines and keep buttons, which
    // overflows the medium detent — it gets the taller detent and a scroll view so
    // the third candidate is always reachable. The short question steps stay at 70%.
    <Sheet ref={ref} snapPoints={['90%']} fitContent={step !== 'candidates'}>
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Above the step, not inside one: the pass can fail from any of them,
            and she should read why before the question she is being re-asked. */}
        {error && (
          <Text
            testID="guided-error"
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {error}
          </Text>
        )}

        {step === 'goal' && (
          <View style={{ gap: spacing.md }} testID="guided-goal">
            {label(affirmationsCopy.guided.goalTitle)}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {affirmationsCopy.guided.goalAreas.map((area) => (
                <Chip
                  key={area}
                  label={area}
                  selected={goalArea === area}
                  onPress={() => setGoalArea(area)}
                />
              ))}
            </View>

            <Input
              inSheet
              value={goalText}
              onChangeText={setGoalText}
              placeholder={affirmationsCopy.guided.goalPlaceholder}
              testID="guided-goal-text"
            />

            <PillButton
              // The goal is now the only question, so this button generates
              // rather than advancing to a next step.
              title={affirmationsCopy.guided.create}
              disabled={goalArea === null && goalText.trim() === ''}
              onPress={() =>
                onGenerate({
                  goalArea: goalArea ?? 'Confidence',
                  ...(goalText.trim() ? { goalText: goalText.trim() } : {}),
                })
              }
              testID="guided-goal-next"
            />
          </View>
        )}

        {step === 'candidates' && (
          <View style={{ gap: spacing.md }} testID="guided-candidates">
            {label(affirmationsCopy.guided.candidatesTitle)}

            {busy && (
              <Text
                testID="guided-generating"
                allowFontScaling={false}
                style={[scaledType('body', scale), { color: colors.text.secondary }]}
              >
                {affirmationsCopy.guided.generating}
              </Text>
            )}

            {candidates.map((candidate) => (
              <View
                key={candidate.id}
                style={{ gap: spacing.xs }}
                testID={`candidate-${candidate.id}`}
              >
                <SerifDisplay variant="momentTitle">{candidate.text}</SerifDisplay>

                {candidate.whyLine && (
                  <Text
                    allowFontScaling={false}
                    style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
                  >
                    {candidate.whyLine}
                  </Text>
                )}

                <PillButton
                  title={affirmationsCopy.keep}
                  onPress={() => onKeep(candidate.id)}
                  testID={`candidate-keep-${candidate.id}`}
                />
              </View>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
});
