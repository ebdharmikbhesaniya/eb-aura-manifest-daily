import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

export interface ReminderPreviewProps {
  app: string;
  /** The trailing time or "now". */
  when: string;
  body: string;
  /** Parchment (the second chance's inset) instead of card white. */
  tone?: 'card' | 'parchment';
}

/** A facsimile of the real push — an orb tile, the app name, her time, tomorrow's line. */
export function ReminderPreview({ app, when, body, tone = 'card' }: ReminderPreviewProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const parchment = tone === 'parchment';

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: parchment ? spacing.md : spacing.md + 2,
        borderRadius: parchment ? radii.chip : radii.group,
        backgroundColor: parchment ? colors.accent.parchment : colors.surface.card,
        borderWidth: parchment ? 0 : 1,
        borderColor: colors.surface.border,
        ...(parchment ? {} : shadows.card),
      }}
    >
      <LinearGradient
        colors={[colors.orb.shimmer, colors.orb.core, colors.orb.halo]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={{ width: parchment ? 34 : 38, height: parchment ? 34 : 38, borderRadius: 10 }}
      />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text
            style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text.primary }}
          >
            {app}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: colors.text.label }}>
            {when}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13.5,
            lineHeight: 19,
            color: colors.text.body,
          }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}
