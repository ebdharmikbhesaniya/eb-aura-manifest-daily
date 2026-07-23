import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Card, IconTile, ListRow, RowGroup } from '@/components';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The transparency entries (product 11: the trust centre's front door) plus the
 * v4 privacy note. "Never include" leads because it is the boundary she set;
 * "What Aura knows" wears the orb tile — memory is Aura's own surface.
 */
export function ProfileTrustLinks() {
  const router = useRouter();
  const { colors, layout, radii, typography } = useTheme();

  return (
    <>
      <RowGroup separatorInset="leading">
        <ListRow
          title={profileCopy.links.neverInclude}
          subtitle={profileCopy.links.neverIncludeHint}
          leading={<IconTile tint="bone" glyph="✕" />}
          onPress={() => router.push('/profile/never-include' as never)}
        />
        <ListRow
          title={profileCopy.links.whatAuraKnows}
          subtitle={profileCopy.links.whatAuraKnowsHint}
          leading={<IconTile tint="orb" />}
          onPress={() => router.push('/profile/what-aura-knows' as never)}
        />
      </RowGroup>

      {/* Parchment, not white: a statement from Aura, not another tappable row.
          v4 gives it the tighter 16pt surface rather than a full card. */}
      <Card
        variant="solid"
        style={{
          backgroundColor: colors.accent.parchment,
          borderRadius: radii.field,
          paddingVertical: layout.tilePaddingV,
          paddingHorizontal: layout.listRowPaddingH,
        }}
      >
        <Text style={[typography.listSubtitle, { color: colors.text.secondary }]}>
          {profileCopy.privacyNote}
        </Text>
      </Card>
    </>
  );
}
