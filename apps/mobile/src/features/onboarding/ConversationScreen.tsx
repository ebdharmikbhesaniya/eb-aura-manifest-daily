import type { OnboardingScreenId } from '@aura/shared';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { EditGuardSheet } from './EditGuardSheet';
import { Eyebrow } from './Eyebrow';
import { previousScreen, progressOf, QUESTION_SCREENS, screenRoute, SKIPPABLE } from './flow';
import { OnboardingHeader } from './OnboardingHeader';
import { useHiddenScreens } from './useHiddenScreens';

export interface ConversationScreenProps {
  screenId: OnboardingScreenId;
  /** The serif question. Value beats supply their own content instead. */
  question?: string;
  /** Centre the content block — the design's value/consent beats. */
  center?: boolean;
  /** Quiet guidance under the question ("Pick up to three."). */
  helper?: string;
  /** A small uppercase line ABOVE the question ("Because you chose calm"). */
  eyebrow?: string;
  children?: ReactNode;
  /** Continue. Omit on the auto-advancing single-choice questions. */
  primaryTitle?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  /** The header's Skip — only offered on the design's skippable questions. */
  onSkip?: () => void;
  /** A secondary text action under Continue. */
  secondaryTitle?: string;
  onSecondary?: () => void;
  /** `text` (default) is a quiet link; `outline` gives the alternative equal standing. */
  secondaryVariant?: 'text' | 'outline';
  /** A quiet note pinned above the buttons (design footnotes). */
  footnote?: string;
  testID?: string;
}

/**
 * The shared shell of the v5 conversation: the header (back circle, ember
 * track, Skip), an optional eyebrow, one serif question closing on an ember
 * mark, the helper, the answer surface, and a floating Continue above the
 * keyboard. Back means "fix an earlier answer" once anything is answered
 * (product 07 — revise, never restart); before that it simply steps back.
 */
export function ConversationScreen({
  screenId,
  question,
  center = false,
  helper,
  eyebrow,
  children,
  primaryTitle,
  onPrimary,
  primaryDisabled = false,
  onSkip,
  secondaryTitle,
  onSecondary,
  secondaryVariant = 'text',
  footnote,
  testID,
}: ConversationScreenProps) {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const [editGuardOpen, setEditGuardOpen] = useState(false);
  const answers = useOnboardingDraft((s) => s.answers);
  const hidden = useHiddenScreens();

  const progress = progressOf(screenId, hidden, answers);
  const hasSomethingToRevise = QUESTION_SCREENS.some((id) => answers[id]);
  const previous = previousScreen(screenId, hidden, answers);

  const stepBack = () => {
    if (!previous) return;
    // `replace`, not `back`: a cold start lands here via a Redirect with no
    // history behind it. Moving `currentScreen` keeps resume honest.
    useOnboardingDraft.getState().advanceTo(previous);
    router.replace(screenRoute(previous) as never);
  };

  const onBack = hasSomethingToRevise
    ? () => setEditGuardOpen(true)
    : previous
      ? stepBack
      : undefined;

  return (
    <Screen {...(testID ? { testID } : {})}>
      {progress !== null && (
        <OnboardingHeader
          progress={progress}
          {...(onBack
            ? {
                onBack,
                backLabel: hasSomethingToRevise
                  ? onboardingCopy.editGuard.entry
                  : onboardingCopy.editGuard.back,
              }
            : {})}
          {...(onSkip && SKIPPABLE.has(screenId) ? { onSkip } : {})}
        />
      )}

      <KeyboardAvoidingView
        // The floating-Continue rule: the button rides the keyboard rather than
        // hiding under it. `padding` on both platforms — under edge-to-edge
        // Android stops applying adjustResize for the IME.
        behavior="padding"
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: spacing.lg,
            paddingBottom: spacing.lg,
            gap: spacing.lg + 4,
            justifyContent: center ? 'center' : 'flex-start',
          }}
        >
          {(eyebrow !== undefined || question !== undefined || helper !== undefined) && (
            <View style={{ gap: spacing.sm + 2 }}>
              {eyebrow !== undefined && <Eyebrow>{eyebrow}</Eyebrow>}
              {question !== undefined && <SerifDisplay variant="question">{question}</SerifDisplay>}
              {helper !== undefined && (
                <Text style={[typography.body, { color: colors.text.secondary }]}>{helper}</Text>
              )}
            </View>
          )}
          <View style={{ flex: center ? 0 : 1, gap: spacing.md }}>{children}</View>
          {footnote !== undefined && (
            <Text style={[typography.bodySmall, { color: colors.text.label }]}>{footnote}</Text>
          )}
        </ScrollView>

        {(primaryTitle || secondaryTitle) && (
          <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
            {primaryTitle && onPrimary && (
              <PillButton title={primaryTitle} onPress={onPrimary} disabled={primaryDisabled} />
            )}
            {secondaryTitle && onSecondary && secondaryVariant === 'outline' && (
              <OutlinePill title={secondaryTitle} onPress={onSecondary} />
            )}
            {secondaryTitle && onSecondary && secondaryVariant === 'text' && (
              <TextButton title={secondaryTitle} onPress={onSecondary} />
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <EditGuardSheet open={editGuardOpen} onClose={() => setEditGuardOpen(false)} />
    </Screen>
  );
}
