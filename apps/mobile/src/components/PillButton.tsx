import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic } from '@/theme/haptics';
import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface PillButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** A leading glyph (e.g. a provider logo) shown before the label. */
  icon?: ReactNode;
  testID?: string;
}

/**
 * The primary CTA (v3 §buttons): filled ink pill, cream label. Ink is the
 * app's single high-contrast action colour — one primary action per screen,
 * and this is it.
 */
export function PillButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  testID,
}: PillButtonProps) {
  const { colors, layout, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  // Loading is a form of disabled: a live button under a spinner lets a second
  // tap fire the CTA twice.
  const inert = disabled || loading;

  // An inert pill fills with `cta.disabled` — a LIGHT olive in light theme. The
  // label and spinner must switch off the cream `onCta` colour or they vanish
  // against that fill (cream-on-light); the disabled text colour keeps them
  // readable. Enabled keeps the cream label on the ink pill.
  const foreground = inert ? colors.text.disabled : colors.text.onCta;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPressIn={() => {
        // Same 0.97 / 150ms acknowledgment as chips (product 13 §catalog) —
        // one press language across the app, and it collapses under Reduce Motion.
        scale.value = chipSelectScale(true, motion);
      }}
      onPressOut={() => {
        scale.value = chipSelectScale(false, motion);
      }}
      onPress={() => {
        // Light impact, per the product-13 haptic table. Fired before the
        // handler so the phone answers the finger, not the navigation.
        void haptic('primaryButton');
        onPress();
      }}
    >
      <Animated.View
        style={[
          {
            height: layout.buttonHeight,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: inert ? colors.cta.disabled : colors.cta.background,
          },
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {icon}
            <Text style={[typography.button, { color: foreground }]}>{title}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
