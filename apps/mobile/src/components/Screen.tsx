import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  /** Covers and galleries paint to the physical edges; everything else keeps the margin. */
  edgeToEdge?: boolean;
  /**
   * Hands the TOP inset back to the screen.
   *
   * By default the safe area is padding on this container, which means a scroll
   * view inside it starts below the status bar — and its content is therefore
   * chopped at that line on the way past, mid-glyph, instead of travelling under
   * the status bar the way every iOS list does. A screen that scrolls to its own
   * top edge sets this and pads `insets.top` into its content container instead,
   * so the container reaches the physical top while the content still rests
   * clear of it.
   *
   * Only the top is released — the bottom inset stays, since nothing scrolls
   * out through the home indicator.
   */
  scrollsUnderStatusBar?: boolean;
  /** Applied to the safe-area content container, not the gradient. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Stated as module constants rather than inline literals: a fresh array on every
 * render would be a new prop identity each time, which defeats the memoisation
 * inside SafeAreaView.
 */
const ALL_EDGES = ['top', 'right', 'bottom', 'left'] as const;
const TOP_RELEASED_EDGES = ['right', 'bottom', 'left'] as const;

/**
 * The full-bleed gradient every screen sits on (product 12 §surfaces): content
 * floats on the gradient, never on a flat background. One gradient family
 * app-wide — the tokens shift it per scheme, so dark mode is the same warm
 * world after sundown rather than a different app.
 */
export function Screen({
  children,
  edgeToEdge = false,
  scrollsUnderStatusBar = false,
  style,
  testID,
}: ScreenProps) {
  const { colors, layout } = useTheme();

  return (
    <LinearGradient
      testID={testID}
      // Vertical, bone settling into deeper bone (v3 §surfaces). The
      // library's default axis is already top-centre → bottom-centre.
      colors={[colors.bg.gradientTop, colors.bg.gradientMid, colors.bg.gradientBottom]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        edges={scrollsUnderStatusBar ? TOP_RELEASED_EDGES : ALL_EDGES}
        style={[
          { flex: 1 },
          // Standard screen margin (product 12 §spacing) — screens opt out only
          // when their content is the surface itself (covers, photo galleries).
          !edgeToEdge && { paddingHorizontal: layout.screenMargin },
          style,
        ]}
      >
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}
