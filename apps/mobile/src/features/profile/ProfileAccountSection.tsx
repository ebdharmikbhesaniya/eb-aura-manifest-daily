import { View } from 'react-native';

import { IconTile, Label, ListRow, RowGroup } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

export interface ProfileAccountSectionProps {
  /** Status line under Subscription — the SAME mapping Settings uses. */
  subscriptionSubtitle: string;
  /** True only for anonymous (claimed === false) users. */
  showClaim: boolean;
  onManage: () => void;
  onSecure: () => void;
}

/**
 * The Account section of the control-center profile (spec §3): the plan status
 * you check most, with an action, plus an anonymous-only nudge to secure the
 * account. Everything else stays behind the gear. Self-labeled, so ProfileTab
 * just stacks the sections.
 */
export function ProfileAccountSection({
  subscriptionSubtitle,
  showClaim,
  onManage,
  onSecure,
}: ProfileAccountSectionProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{profileCopy.account.label}</Label>
      <RowGroup separatorInset="leading">
        <ListRow
          title={paywallCopy.subscription.title}
          subtitle={subscriptionSubtitle}
          leading={<IconTile tint="olive" />}
          onPress={onManage}
          testID="profile-subscription-row"
        />
        {showClaim && (
          <ListRow
            title={profileCopy.account.secure.title}
            subtitle={profileCopy.account.secure.subtitle}
            leading={<IconTile tint="blush" />}
            onPress={onSecure}
            testID="profile-secure-row"
          />
        )}
      </RowGroup>
    </View>
  );
}
