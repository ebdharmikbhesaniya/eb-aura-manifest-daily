import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { MiniPlayer } from '@/features/player/MiniPlayer';
import { usePlayback } from '@/features/player/usePlayback';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Four tabs, exactly as product 11 / 06 §1 specify: Home · Affirmations ·
 * Gratitude · Profile. No hamburger, no "More" tab — that is a product rule.
 *
 * The floating pill TabBar is the design system's (Phase 1), and the mini-player
 * rides above it (06 §1).
 *
 * `usePlayback` is mounted HERE, once, rather than inside the player screen —
 * that is what lets audio outlive the cover and keep going while she moves
 * between tabs. Mounting it on the screen would tie the audio's lifetime to a
 * navigation stack entry, and minimizing would silence it.
 */
export default function TabsLayout() {
  const playback = usePlayback();
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  /**
   * Where the mini-player's bottom edge sits, measured from the bottom of the
   * window.
   *
   * Both children are absolutely positioned, so this slot measures zero height.
   * That is deliberate: react-navigation reserves whatever height it finds here
   * as a bottom inset on every tab screen, and the bar is supposed to FLOAT
   * over content — the screens pad themselves with `TAB_BAR_CLEARANCE` instead.
   *
   * The pill has to clear the safe-area inset, the bar's `spacing.lg` float,
   * the bar itself, and then leave a gap, which is what puts it ABOVE the bar
   * as 06 §1 asks and clear of Android's system navigation bar.
   *
   * Driven by the inset rather than by `Platform`: the home indicator is a
   * bottom inset too, so the same arithmetic is correct on both platforms.
   */
  const miniPlayerOffset = insets.bottom + spacing.lg + TAB_BAR_HEIGHT + spacing.sm;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        // `box-none` so the transparent area beside the floating pill stays
        // tappable by the screen underneath rather than swallowing the touch.
        <View pointerEvents="box-none">
          <MiniPlayer
            onToggle={playback.toggle}
            bottomOffset={miniPlayerOffset}
            testID="mini-player"
          />
          <TabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirmations' }} />
      <Tabs.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
