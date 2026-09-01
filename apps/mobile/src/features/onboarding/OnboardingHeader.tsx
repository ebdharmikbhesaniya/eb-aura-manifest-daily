import { Pressable, Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/** Design v5: a 34pt circular back button, a 3pt track, an optional Skip. */
const BACK_SIZE = 34;
const TRACK_HEIGHT = 3;

export interface OnboardingHeaderProps {
  /** 0..1 — how far along the conversation she is. */
  progress: number;
  /** The back circle. Omit to reserve its slot without drawing it. */
  onBack?: () => void;
  /** What the circle does, for screen readers ("Fix an earlier answer"). */
  backLabel?: string;
  /** Header Skip — only the design's skippable questions pass it. */
  onSkip?: () => void;
  testID?: string;
}

/**
 * The conversation's wayfinding (design v5, steps 4–19): a white back circle
 * on a hairline, a slim track filling with ember as the conversation deepens,
 * and "Skip" where the question allows it. No counter — the track is the
 * only measure, and it only ever moves forward.
 */
export function OnboardingHeader({
  progress,
  onBack,
  backLabel,
  onSkip,
  testID,
}: OnboardingHeaderProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md + 2,
        paddingVertical: spacing.md,
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? onboardingCopy.header.back}
          hitSlop={spacing.sm}
          onPress={onBack}
          style={({ pressed }) => ({
            width: BACK_SIZE,
            height: BACK_SIZE,
            borderRadius: BACK_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            opacity: pressed ? 0.85 : 1,
            ...shadows.card,
          })}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 18,
              lineHeight: 22,
              color: colors.text.primary,
              // Optical centring of the glyph inside the circle.
              marginLeft: -2,
            }}
          >
            ‹
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: BACK_SIZE, height: BACK_SIZE }} />
      )}

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
        style={{
          flex: 1,
          height: TRACK_HEIGHT,
          borderRadius: radii.pill,
          backgroundColor: colors.accent.oliveSoft,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flex: 1,
            width: `${clamped * 100}%`,
            borderRadius: radii.pill,
            backgroundColor: colors.accent.emberDeep,
          }}
        />
      </View>

      {onSkip ? (
        <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={onSkip}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.text.secondary }}>
            {onboardingCopy.header.skip}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
