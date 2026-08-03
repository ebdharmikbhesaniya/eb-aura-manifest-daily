import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { profileCopy } from '@/copy/profile';
import { paywallCopy } from '@/copy/paywall';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { ProfileAccountSection } from './ProfileAccountSection';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

const base = {
  subscriptionSubtitle: paywallCopy.subscription.premium,
  onManage: jest.fn(),
  onSecure: jest.fn(),
};

describe('ProfileAccountSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('always shows the Account label and Subscription row', async () => {
    await render(<ProfileAccountSection {...base} showClaim={false} />, { wrapper });
    expect(screen.getByText(profileCopy.account.label)).toBeTruthy();
    expect(screen.getByText(paywallCopy.subscription.title)).toBeTruthy();
  });

  it('opens subscription management on press', async () => {
    await render(<ProfileAccountSection {...base} showClaim={false} />, { wrapper });
    fireEvent.press(screen.getByText(paywallCopy.subscription.title));
    expect(base.onManage).toHaveBeenCalled();
  });

  it('hides "Secure your account" when showClaim is false', async () => {
    await render(<ProfileAccountSection {...base} showClaim={false} />, { wrapper });
    expect(screen.queryByText(profileCopy.account.secure.title)).toBeNull();
  });

  it('shows "Secure your account" when showClaim is true', async () => {
    await render(<ProfileAccountSection {...base} showClaim />, { wrapper });
    expect(screen.getByText(profileCopy.account.secure.title)).toBeTruthy();
  });

  it('fires onSecure when the claim row is pressed', async () => {
    await render(<ProfileAccountSection {...base} showClaim />, { wrapper });
    fireEvent.press(screen.getByText(profileCopy.account.secure.title));
    expect(base.onSecure).toHaveBeenCalled();
  });
});
