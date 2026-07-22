import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ICON_TILE_SIZE } from '@/components/RowGroup';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface IconTileProps {
  /** Soft accent washes (v4 profile rows); 'orb' is the ember gradient reserved for memory/voice rows. */
  tint: 'parchment' | 'blush' | 'olive' | 'bone' | 'orb';
  /** Optional small text glyph centered in the tile (✕, ♥ …). */
  glyph?: string;
  testID?: string;
}

/**
 * The small rounded tile that leads a v4 row. One job: a quiet colour swatch
 * that tells the row's category at a glance — never an action.
 */
export function IconTile({ tint, glyph, testID }: IconTileProps) {
  const { colors, radii } = useTheme();
  const scale = clampedFontScale();

  const frame = {
    width: ICON_TILE_SIZE,
    height: ICON_TILE_SIZE,
    borderRadius: radii.chip - 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  const wash = {
    parchment: colors.accent.parchment,
    blush: colors.accent.blushSoft,
    olive: colors.accent.oliveSoft,
    bone: colors.bg.base,
  };

  const label = glyph ? (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
    >
      {glyph}
    </Text>
  ) : null;

  if (tint === 'orb') {
    return (
      <LinearGradient
        testID={testID}
        colors={[colors.orb.core, colors.orb.halo]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={frame}
      >
        {label}
      </LinearGradient>
    );
  }

  return (
    <View testID={testID} style={[frame, { backgroundColor: wash[tint] }]}>
      {label}
    </View>
  );
}
