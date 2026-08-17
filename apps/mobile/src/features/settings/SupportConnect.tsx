import { Linking, Text, View } from 'react-native';
import type { TextInput } from 'react-native';
import { useRef, useState } from 'react';

import { Input, Label, ListRow, PillButton, RowGroup } from '@/components';
import { settingsCopy } from '@/copy/settings';
import { useTheme } from '@/theme/ThemeProvider';

import { SOCIAL_LINKS, SUPPORT_EMAIL } from './support.config';

/**
 * Support & Connect (settings/support): a contact form and the social links.
 *
 * The form composes an email rather than posting to the backend — there is no
 * inbound-mail service in the API yet, and a `mailto:` reaches a real inbox
 * today without one, degrading to whatever mail app she has. Her typed reply-to
 * is carried in the body so support can answer even though the send is from her
 * own client. A social row with a blank url (support.config) is not rendered.
 */
export function SupportConnect() {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  // The only real two-field form in the app, so the only place a "next" key has
  // somewhere to go.
  const messageRef = useRef<TextInput | null>(null);

  const canSend = message.trim().length > 0;

  const send = () => {
    const subject = encodeURIComponent(settingsCopy.support.emailSubject);
    const from = email.trim();
    const body = encodeURIComponent(
      from ? `${message.trim()}\n\n— reply to: ${from}` : message.trim(),
    );
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const links = SOCIAL_LINKS.filter((link) => link.url.trim() !== '');

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={[typography.body, { color: colors.text.secondary }]}>
        {settingsCopy.support.intro}
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Label>{settingsCopy.support.form.emailLabel}</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder={settingsCopy.support.form.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          // "next" rather than "go": this field is the reply-to, not the
          // message, so the action key hands her to the field that matters.
          returnKeyType="next"
          onSubmitEditing={() => messageRef.current?.focus()}
          testID="support-email"
        />
        <Input
          value={message}
          onChangeText={setMessage}
          placeholder={settingsCopy.support.form.messagePlaceholder}
          multiline
          // No returnKeyType here on purpose — the message is multiline, so the
          // return key has to stay a return key.
          fieldRef={messageRef}
          testID="support-message"
        />
        <PillButton
          title={settingsCopy.support.form.send}
          disabled={!canSend}
          onPress={send}
          testID="support-send"
        />
      </View>

      {links.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Label>{settingsCopy.support.connectLabel}</Label>
          <RowGroup separatorInset="edge">
            {links.map((link) => (
              <ListRow
                key={link.id}
                title={link.label}
                onPress={() => void Linking.openURL(link.url)}
                testID={`support-social-${link.id}`}
              />
            ))}
          </RowGroup>
        </View>
      )}
    </View>
  );
}
