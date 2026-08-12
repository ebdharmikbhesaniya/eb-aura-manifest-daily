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
  /**
   * The fill. `ink` is the app's default high-contrast action. `ember` is the
   * one earned exception — the trial CTA on the paywall, which is the letter's
   * own warmth continued into the offer (product 15). Cream label either way.
   */
  tint?: 'ink' | 'ember';
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
  tint = 'ink',
  testID,
}: PillButtonProps) {
  const { colors, layout, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  // Loading is a form of disabled: a live button under a spinner lets a second
  // tap fire the CTA twice.
  const inert = disabled || loading;

  // A purely disabled pill reads as the SAME ink pill at reduced opacity — a
  // clearly-present but muted button. The `cta.disabled` fill was a light olive
  // almost identical to the bone background, so the pill all but vanished and
  // its label sat on near-nothing. Opacity keeps the shape and the label's
  // contrast intact. A loading pill is NOT dimmed: it is working, not disabled.
  const dimmed = disabled && !loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      style={{ opacity: dimmed ? 0.4 : 1 }}
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
            backgroundColor: tint === 'ember' ? colors.accent.ember : colors.cta.background,
          },
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.onCta} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {icon}
            <Text style={[typography.button, { color: colors.text.onCta }]}>{title}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
