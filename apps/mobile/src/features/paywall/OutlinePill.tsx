import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Secondary outline height (v3 §buttons: primary 54, secondary 50). No token — v3 names it directly. */
const OUTLINE_HEIGHT = 50;
const OUTLINE_BORDER = 1.5;

export interface OutlinePillProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/**
 * The secondary pill (v3 §buttons, v4 §subscription/claim): outlined in the CTA
 * ink, unfilled — a real action that deliberately speaks more quietly than the
 * one filled pill a screen is allowed. Used where the design gives an
 * alternative equal standing ("Use an email instead", "Manage or cancel").
 */
export function OutlinePill({
  title,
  onPress,
  disabled = false,
  loading = false,
  testID,
}: OutlinePillProps) {
  const { colors, radii, spacing, typography } = useTheme();

  const inert = disabled || loading;
  const tint = inert ? colors.cta.disabled : colors.cta.background;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => ({
        height: OUTLINE_HEIGHT,
        borderRadius: radii.pill,
        borderWidth: OUTLINE_BORDER,
        borderColor: tint,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <Text style={[typography.button, { color: tint }]}>{title}</Text>
      )}
    </Pressable>
  );
}
