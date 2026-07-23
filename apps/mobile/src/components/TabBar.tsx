import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/TabIcon';
import { useTheme } from '@/theme/ThemeProvider';

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

/**
 * The pill's own height, from the styles below: spacing.sm × 2 vertical padding
 * (16) + a 20pt icon + spacing.xs (4) + the 3pt underline + 1pt border × 2.
 * Keep in step with the padding and icon size used further down.
 */
const TAB_BAR_HEIGHT = 45;

/**
 * Bottom space a scrolling tab screen must leave clear, for THIS device.
 *
 * The static `TAB_BAR_CLEARANCE` guesses; this measures. The bar floats
 * `spacing.lg` above the safe-area inset, so the space it actually occupies is
 * inset + float + its own height — on a phone with a tall navigation bar that
 * comes to well over the old constant, which is how Home's last control ended
 * up underneath the pill.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();
  return insets.bottom + spacing.lg + TAB_BAR_HEIGHT + spacing.lg;
}

/**
 * Bottom space a scrolling tab screen must leave clear.
 *
 * The bar floats over content instead of docking, so nothing reserves room for
 * it: a list that ends at the safe-area edge ends up underneath it. The number
 * is the bar itself (spacing.sm × 2 outer + spacing.sm × 2 inner + a 22pt icon
 * ≈ 54) plus its spacing.lg gap from the edge, rounded up for breathing room.
 * Screens sit inside `Screen`'s safe area, so the inset is already handled.
 */
export const TAB_BAR_CLEARANCE = 88;

/**
 * The floating pill tab bar (product 12 §navigation, 06 §6): four tabs, no
 * more — the IA does not grow tabs. It floats clear of the edges rather than
 * docking, so screens keep their full-bleed gradient underneath.
 *
 * Icons, no captions. The four destinations are fixed and their glyphs are
 * conventional, so a caption under each one is a label she reads once and then
 * never again — and product 12 asks for quiet chrome. The title has NOT been
 * dropped though: it still rides on `accessibilityLabel`, which is what
 * VoiceOver announces, so nothing is lost for anyone navigating by voice.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, radii, spacing, iconSizes } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        // spacing.lg clear of the safe-area edge — above the home indicator on
        // notch devices, above the physical edge elsewhere. Floats, never docks.
        bottom: insets.bottom + spacing.lg,
        flexDirection: 'row',
        borderRadius: radii.pill,
        backgroundColor: colors.surface.cardGlassy,
        // Same hairline as glassy cards — the bar is a glassy surface, not chrome.
        borderWidth: 1,
        borderColor: colors.surface.border,
        // A slim pill, per v4: the ONLY vertical padding lives on each tab
        // (below) so it isn't doubled here — a second layer of it is what made
        // the bar read as a thick block. Horizontal padding keeps the outer
        // icons off the pill's rounded ends.
        paddingHorizontal: spacing.sm,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const title = descriptors[route.key]?.options.title ?? route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            testID={`tab-${route.name}`}
            style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }}
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
            <TabIcon
              name={route.name}
              // 20pt to match the v4 tab bar (iconSizes.md); the 22pt default
              // was part of what made the bar sit tall.
              size={iconSizes.md}
              // Ink is the action colour (v3: actions are ink pills); the
              // active tab is one of its few sanctioned uses.
              color={focused ? colors.cta.background : colors.text.secondary}
            />
            {/* The ember underline is v4's active mark — one of ember's few
                sanctioned appearances outside voice, because the bar IS where
                the app speaks from. Always rendered so rows don't reflow;
                transparent when resting. */}
            <View
              style={{
                width: spacing.md,
                height: 3,
                marginTop: spacing.xs,
                borderRadius: radii.pill,
                backgroundColor: focused ? colors.accent.ember : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
