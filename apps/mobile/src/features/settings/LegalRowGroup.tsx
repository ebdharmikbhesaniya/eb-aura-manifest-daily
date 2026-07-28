import { Linking } from 'react-native';

import { ListRow, RowGroup } from '@/components';
import { settingsCopy } from '@/copy/settings';
import { env } from '@/lib/env';

/**
 * The Legal card in Settings: Terms and Privacy, each opening the
 * backend-served web page in the browser (the legal text lives only on the
 * backend, the app links to it). A row appears only when its URL is configured,
 * mirroring the paywall footer, so a dev build without the URLs simply omits it
 * rather than opening `undefined`.
 */
export function LegalRowGroup() {
  const terms = env.EXPO_PUBLIC_TERMS_URL;
  const privacy = env.EXPO_PUBLIC_PRIVACY_URL;

  if (!terms && !privacy) return null;

  return (
    <RowGroup separatorInset="edge">
      {terms ? (
        <ListRow
          title={settingsCopy.legal.terms.title}
          subtitle={settingsCopy.legal.terms.subtitle}
          onPress={() => void Linking.openURL(terms)}
          testID="settings-terms-row"
        />
      ) : null}
      {privacy ? (
        <ListRow
          title={settingsCopy.legal.privacy.title}
          subtitle={settingsCopy.legal.privacy.subtitle}
          onPress={() => void Linking.openURL(privacy)}
          testID="settings-privacy-row"
        />
      ) : null}
    </RowGroup>
  );
}
