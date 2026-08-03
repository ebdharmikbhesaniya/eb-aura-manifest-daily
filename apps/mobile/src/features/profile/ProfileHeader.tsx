import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { SerifDisplay } from '@/components';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

import { ProfilePlanChip } from './ProfilePlanChip';

export interface ProfileHeaderProps {
  /** Trimmed name; empty string falls back to the in-voice empty prompt. */
  name: string;
  onEditName: () => void;
  onOpenSettings: () => void;
  /** Subscription status pill (spec §3). */
  planLabel: string;
  planTint: 'accent' | 'neutral';
  onPressPlan: () => void;
}

/**
 * The v4 profile header: her name in serif on the left, the gear on the right
 * (06 §7 — the gear lives on Profile, never on Home), tagline underneath.
 *
 * The name is still edited from here rather than from a row in Basics: it only
 * belongs in one place, and repeating it as both the page's title and a
 * labelled field would be the page telling her the same thing twice.
 */
export function ProfileHeader({
  name,
  onEditName,
  onOpenSettings,
  planLabel,
  planTint,
  onPressPlan,
}: ProfileHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profileCopy.fields.name}
          onPress={onEditName}
          style={({ pressed }) => ({ flexShrink: 1, opacity: pressed ? 0.6 : 1 })}
        >
          {name ? (
            <SerifDisplay variant="title">{name}</SerifDisplay>
          ) : (
            <Text style={[typography.body, { color: colors.text.secondary }]}>
              {profileCopy.edit.empty}
            </Text>
          )}
        </Pressable>

        <ProfilePlanChip label={planLabel} tint={planTint} onPress={onPressPlan} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profileCopy.settings}
          onPress={onOpenSettings}
          testID="profile-settings"
          style={({ pressed }) => ({
            width: SETTINGS_BUTTON_SIZE,
            height: SETTINGS_BUTTON_SIZE,
            borderRadius: SETTINGS_BUTTON_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name="settings-outline"
            size={18}
            color={colors.text.secondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>

      <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
        {profileCopy.tagline}
      </Text>
    </View>
  );
}

/** V4 gear button diameter — a quiet secondary control, smaller than a CTA. */
const SETTINGS_BUTTON_SIZE = 34;
