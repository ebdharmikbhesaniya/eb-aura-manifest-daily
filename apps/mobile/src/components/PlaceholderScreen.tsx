import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Phase 0 scaffolding only. Every tab renders this until its real screen lands.
 *
 * Minimal by design, but still themed — even a placeholder renders in the
 * brand's type and colours so nothing unthemed ever reaches a device.
 */
export function PlaceholderScreen({ title, phase }: { title: string; phase: string }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
      <Text style={[typography.sheetTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>{phase}</Text>
    </View>
  );
}
