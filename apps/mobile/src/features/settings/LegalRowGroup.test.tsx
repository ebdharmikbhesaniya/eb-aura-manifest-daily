import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { LegalRowGroup } from './LegalRowGroup';

jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_TERMS_URL: 'https://api.example.com/terms',
    EXPO_PUBLIC_PRIVACY_URL: 'https://api.example.com/privacy',
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('LegalRowGroup', () => {
  it('opens the Terms web page when the Terms row is pressed', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<LegalRowGroup />, { wrapper });

    fireEvent.press(screen.getByTestId('settings-terms-row'));

    expect(openURL).toHaveBeenCalledWith('https://api.example.com/terms');
  });

  it('opens the Privacy web page when the Privacy row is pressed', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<LegalRowGroup />, { wrapper });

    fireEvent.press(screen.getByTestId('settings-privacy-row'));

    expect(openURL).toHaveBeenCalledWith('https://api.example.com/privacy');
  });
});
