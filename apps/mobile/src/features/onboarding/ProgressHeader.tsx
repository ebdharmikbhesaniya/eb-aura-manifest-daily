import { Pressable, Text, View } from 'react-native';

import { Label } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/** V4 progress track height — between spacing.xs and sm; no token fits. */
const TRACK_HEIGHT = 6;

export interface ProgressHeaderProps {
  /** 1-based position in the conversation. */
  step: number;
  total: number;
  /** The back chevron. Omit to hide it (reflection beats — nothing to go back to mid-beat). */
  onBack?: () => void;
  /** What the chevron does, for screen readers ("Fix an earlier answer"). */
  backLabel?: string;
  testID?: string;
}

/**
 * The conversation's wayfinding (v4 S3–S11): back chevron, a slim rounded
 * track filling with ember as the conversation deepens, and an honest step
 * counter. One job — where she is; navigation behaviour belongs to the caller.
 */
export function ProgressHeader({ step, total, onBack, backLabel, testID }: ProgressHeaderProps) {
  const { colors, iconSizes, radii, spacing, typography } = useTheme();
  const progress = total > 0 ? Math.min(1, Math.max(0, step / total)) : 0;

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
          {...(backLabel !== undefined && { accessibilityLabel: backLabel })}
          hitSlop={spacing.md}
          onPress={onBack}
        >
          <Text
            allowFontScaling={false}
            style={[
              // Monospaced: the counter must not shift as it counts up.
              typography.progressCounter,
              {
                fontSize: iconSizes.md,
                lineHeight: iconSizes.md + spacing.xs,
                color: colors.text.secondary,
              },
            ]}
          >
            ‹
          </Text>
        </Pressable>
      ) : (
        // Reserve the chevron's slot so the track never jumps when it hides.
        <View style={{ width: iconSizes.md }} />
      )}

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: step }}
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
            width: `${progress * 100}%`,
            borderRadius: radii.pill,
            backgroundColor: colors.accent.emberDeep,
          }}
        />
      </View>

      <Label>{`${step}/${total}`}</Label>
    </View>
  );
}
