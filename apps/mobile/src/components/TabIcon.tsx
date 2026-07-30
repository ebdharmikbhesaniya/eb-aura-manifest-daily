import { Ionicons } from '@expo/vector-icons';

/** The four product tabs (06 §6). The IA does not grow tabs, so neither does this. */
export type TabName = 'home' | 'affirmations' | 'gratitude' | 'profile';

/**
 * Ionicons per tab, as an outline/filled PAIR: the resting tab wears the light
 * outline, the active tab fills in — the modern bottom-nav idiom (a filled,
 * coloured glyph is the clearest "you are here"). Ionicons ships in the bundle,
 * so both halves draw on the first frame, online or off.
 *
 * Glyphs stay semantic: Home is a house, Affirmations the concentric orb/disc,
 * Gratitude a heart, Profile a person. Typed against Ionicons' catalogue, so a
 * name that does not exist is a compile error, not a blank square.
 */
const GLYPHS: Record<
  TabName,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  home: { outline: 'home-outline', filled: 'home' },
  affirmations: { outline: 'disc-outline', filled: 'disc' },
  gratitude: { outline: 'heart-outline', filled: 'heart' },
  profile: { outline: 'person-outline', filled: 'person' },
};

export interface TabIconProps {
  name: string;
  color: string;
  size?: number;
  /** Active tab fills its glyph in; resting tabs keep the outline. */
  focused?: boolean;
}

/**
 * A tab glyph. Unknown route names render nothing rather than throwing: a tab
 * added without a glyph should look unfinished, not crash the shell.
 */
export function TabIcon({ name, color, size = 24, focused = false }: TabIconProps) {
  const glyph = GLYPHS[name as TabName];
  if (!glyph) return null;

  return (
    <Ionicons
      name={focused ? glyph.filled : glyph.outline}
      size={size}
      color={color}
      testID={`tab-icon-${name}`}
    />
  );
}
