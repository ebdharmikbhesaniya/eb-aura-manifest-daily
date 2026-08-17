import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  /** Covers and galleries paint to the physical edges; everything else keeps the margin. */
  edgeToEdge?: boolean;
  /** Applied to the safe-area content container, not the gradient. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The full-bleed gradient every screen sits on (product 12 §surfaces): content
 * floats on the gradient, never on a flat background. One gradient family
 * app-wide — the tokens shift it per scheme, so dark mode is the same warm
 * world after sundown rather than a different app.
 */
export function Screen({ children, edgeToEdge = false, style, testID }: ScreenProps) {
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
