import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { usePlayback } from '@/features/player/usePlayback';

/**
 * Four tabs, exactly as product 11 / 06 §1 specify: Home · Affirmations ·
 * Gratitude · Profile. No hamburger, no "More" tab — that is a product rule.
 *
 * The floating pill TabBar is the design system's (Phase 1). Aura Design v3
 * carries no mini-player on any screen, so nothing rides above the bar: the
 * tab-bar slot is the bar alone.
 *
 * `usePlayback` is still mounted HERE, once, rather than inside the player
 * screen — that is what lets audio outlive the cover and keep going while she
 * moves between tabs. Mounting it on the screen would tie the audio's lifetime
 * to a navigation stack entry, and minimizing would silence it.
 */
export default function TabsLayout() {
  usePlayback();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirmations' }} />
      <Tabs.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
