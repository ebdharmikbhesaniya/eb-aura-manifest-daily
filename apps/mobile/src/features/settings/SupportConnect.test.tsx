import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { SupportConnect } from './SupportConnect';
import { SUPPORT_EMAIL } from './support.config';

/**
 * The config is stubbed rather than read live.
 *
 * This suite used to press `SOCIAL_LINKS[0]` from the real file, which made it
 * a test of whatever happened to be configured that week — it broke the moment
 * the placeholder handles were blanked, even though nothing about the component
 * had changed. Stubbing pins the two behaviours that ARE the contract: a link
 * with a url opens, and a link without one is not rendered at all.
 */
jest.mock('./support.config', () => ({
  SUPPORT_EMAIL: 'support@example.test',
  SOCIAL_LINKS: [
    { id: 'instagram', label: 'Instagram', url: 'https://example.test/instagram' },
    { id: 'x', label: 'X (Twitter)', url: '' },
  ],
}));

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

  it('opens a configured social link in the browser', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<SupportConnect />, { wrapper });

    fireEvent.press(screen.getByTestId('support-social-instagram'));

    expect(openURL).toHaveBeenCalledWith('https://example.test/instagram');
  });

  /**
   * A row that goes nowhere is worse than no row, and a store reviewer taps it.
   * All three handles ship blank until the accounts exist.
   */
  it('renders no row for a social link with no url', async () => {
    await render(<SupportConnect />, { wrapper });

    expect(screen.queryByTestId('support-social-x')).toBeNull();
  });
});
