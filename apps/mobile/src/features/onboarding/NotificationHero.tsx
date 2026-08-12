import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface NotificationHeroProps {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
}

/**
 * A focal visual for the notification screens — the ember orb (the app's voice
 * colour) glowing behind a single glyph. It gives these "sell" beats the same
 * warmth and centre of gravity the paywall gets from its timeline, so they read
 * as designed moments rather than a form.
 */
export function NotificationHero({ icon, size = 76 }: NotificationHeroProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
      <LinearGradient
        colors={[colors.orb.core, colors.orb.halo]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          // A soft ember glow so the orb sits on the bone rather than being
          // pasted onto it.
          shadowColor: colors.accent.ember,
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Ionicons name={icon} size={Math.round(size * 0.45)} color={colors.text.onCta} />
      </LinearGradient>
    </View>
  );
}
