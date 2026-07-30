import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/TabIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

/**
 * Structural subset of react-navigation's `BottomTabBarProps`. The real type
 * lives in @react-navigation/bottom-tabs — a transitive dependency of
 * expo-router that pnpm's strict node_modules keeps un-importable. The subset
 * states exactly what the bar consumes, and stays assignable to the real
 * props at the `tabBar={...}` call site.
 */
export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } } | undefined>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

/** The bar's content height above the safe-area inset — drives scroll clearance. */
const BAR_CONTENT_HEIGHT = 58;

/**
 * Bottom space a scrolling tab screen must leave clear, for THIS device. The bar
 * docks to the bottom edge, so a screen must clear its content height plus the
 * safe-area inset it pads itself with.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();
  return insets.bottom + BAR_CONTENT_HEIGHT + spacing.md;
}

/**
 * The bottom tab bar (product 12 §navigation, 06 §6): four tabs, no more — the
 * IA does not grow tabs. A clean docked bar with a rounded top edge, each tab a
 * glyph over its label. The active tab FILLS its glyph in and colours it ember,
 * with a soft ember chip behind it — the modern bottom-nav idiom, the clearest
 * "you are here". The title is the label AND the `accessibilityLabel`, so voice
 * and sighted users read the same word.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, radii, spacing, iconSizes, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const scale = clampedFontScale();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        backgroundColor: colors.surface.card,
        borderTopLeftRadius: radii.sheet,
        borderTopRightRadius: radii.sheet,
        // A hairline at the seam, and the safe-area inset padded into the bar.
        borderTopWidth: 1,
        borderColor: colors.surface.border,
        paddingTop: spacing.sm,
        paddingBottom: insets.bottom + spacing.xs,
        paddingHorizontal: spacing.sm,
        // Soft lift so the bar reads above the screen it caps — the field preset,
        // flipped to throw its shadow UP from the docked edge.
        ...shadows.field,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      {state.routes.map((route) => {
        const focused = state.routes.indexOf(route) === state.index;
        const title = descriptors[route.key]?.options.title ?? route.name;
        // Resting glyphs are dark ink (the reference's crisp outline); the active
        // one turns ember. Labels stay a step quieter than their glyph.
        const iconColor = focused ? colors.accent.emberDeep : colors.text.primary;
        const labelColor = focused ? colors.accent.emberDeep : colors.text.secondary;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            testID={`tab-${route.name}`}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
            onPress={() => {
              // Standard react-navigation contract: a screen may intercept its
              // own tab press (scroll-to-top et al.) by preventing default.
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            {/* The active mark is the FILLED, ember glyph itself — no chip behind
                it. The reference's highlight reads as noise on our warm surface,
                and the fill + colour already says "you are here" cleanly. */}
            <View style={{ paddingVertical: 5 }}>
              <TabIcon name={route.name} size={iconSizes.lg} color={iconColor} focused={focused} />
            </View>

            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={{
                fontSize: 11 * scale,
                letterSpacing: 0.1,
                color: labelColor,
                fontWeight: focused ? '600' : '400',
              }}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
