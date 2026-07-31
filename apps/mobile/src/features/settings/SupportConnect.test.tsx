import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { SupportConnect } from './SupportConnect';
import { SOCIAL_LINKS, SUPPORT_EMAIL } from './support.config';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('SupportConnect', () => {
  it('keeps Send disabled until she has written a message', async () => {
    await render(<SupportConnect />, { wrapper });

    expect(screen.getByLabelText('Send message').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('support-message'), 'The audio will not play');

    expect(screen.getByLabelText('Send message').props.accessibilityState.disabled).toBe(false);
  });

  it('composes an email to support with her message and reply-to', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<SupportConnect />, { wrapper });

    await fireEvent.changeText(screen.getByTestId('support-email'), 'her@example.com');
    await fireEvent.changeText(screen.getByTestId('support-message'), 'Thank you');
    fireEvent.press(screen.getByTestId('support-send'));

    const url = openURL.mock.calls[0]?.[0] ?? '';
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(url).toContain(encodeURIComponent('Thank you'));
    expect(url).toContain(encodeURIComponent('her@example.com'));
  });

  it('opens each configured social link in the browser', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<SupportConnect />, { wrapper });

    const first = SOCIAL_LINKS[0]!;
    fireEvent.press(screen.getByTestId(`support-social-${first.id}`));

    expect(openURL).toHaveBeenCalledWith(first.url);
  });
});
