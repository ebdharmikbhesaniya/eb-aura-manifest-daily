import type { OnboardingScreenId } from '@aura/shared';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { EditGuardSheet } from './EditGuardSheet';
import { SCREEN_ORDER } from './flow';
import { ProgressHeader } from './ProgressHeader';

export interface ConversationScreenProps {
  question: string;
  /** Quiet guidance under the question ("Pick up to two."). */
  helper?: string;
  /**
   * Drives the v4 progress header. Screens outside the live flow (SCREEN_ORDER)
   * render no header — the track never lies about where she is.
   */
  screenId?: OnboardingScreenId;
  children?: ReactNode;
  /** Continue. Omit to let the content area drive advancement (chips-only screens). */
  primaryTitle?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  /** Skip, on the personal questions that allow it (product 07 — never S3). */
  skipTitle?: string;
  onSkip?: () => void;
  /** S1/S2 hide it — there is nothing to fix yet. */
  showEditGuard?: boolean;
  testID?: string;
}

/**
 * The shared shell of the conversation (product 07 rules): the v4 progress
 * header, one serif question, the answer surface, a floating Continue above
 * the keyboard, and the edit-guard entry — now the header's back chevron
 * (back means "fix an earlier answer", never a raw pop). Screens supply only
 * what differs.
 */
export function ConversationScreen({
  question,
  helper,
  screenId,
  children,
  primaryTitle,
  onPrimary,
  primaryDisabled = false,
  skipTitle,
  onSkip,
  showEditGuard = true,
  testID,
}: ConversationScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const [editGuardOpen, setEditGuardOpen] = useState(false);

  const stepIndex = screenId ? SCREEN_ORDER.indexOf(screenId) : -1;
  const hasHeader = stepIndex >= 0;

  return (
    <Screen {...(testID ? { testID } : {})}>
      {hasHeader && (
        <ProgressHeader
          step={stepIndex + 1}
          total={SCREEN_ORDER.length}
          {...(showEditGuard
            ? {
                onBack: () => setEditGuardOpen(true),
                backLabel: onboardingCopy.editGuard.entry,
              }
            : {})}
        />
      )}

      <KeyboardAvoidingView
        // The floating-Continue rule (product 07 shared spec): the button rides
        // the keyboard rather than hiding under it.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.xl, gap: spacing.xl }}
        >
          <View style={{ gap: spacing.sm }}>
            <SerifDisplay variant="question">{question}</SerifDisplay>
            {helper !== undefined && (
              <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>{helper}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: spacing.md }}>{children}</View>
        </ScrollView>

        <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {primaryTitle && onPrimary && (
            <PillButton title={primaryTitle} onPress={onPrimary} disabled={primaryDisabled} />
          )}
          {skipTitle && onSkip && <TextButton title={skipTitle} onPress={onSkip} />}
          {/* Screens without a header (outside the live flow) keep the text entry. */}
          {!hasHeader && showEditGuard && (
            <TextButton
              title={onboardingCopy.editGuard.entry}
              onPress={() => setEditGuardOpen(true)}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <EditGuardSheet open={editGuardOpen} onClose={() => setEditGuardOpen(false)} />
    </Screen>
  );
}
