import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { profileCopy } from '@/copy/profile';
import { ThemeProvider } from '@/theme/ThemeProvider';

import * as api from './api';
import { ProfileTab } from './ProfileTab';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
}));
jest.mock('./api');
// Controllable so tests can drive the entitlement and claim-status branches
// (the `mock`-prefix lets the jest factory close over them).
let mockEntitlement = { premium: false, inTrial: false, loading: false, info: null };
let mockAccount: { claimed: boolean | undefined; appleAvailable: boolean } = {
  claimed: false,
  appleAvailable: false,
};
jest.mock('@/features/paywall/useEntitlement', () => ({
  useEntitlement: () => mockEntitlement,
}));
jest.mock('@/features/auth/useAccountStatus', () => ({
  useAccountStatus: () => mockAccount,
}));
// ClaimSheet is a @gorhom bottom sheet needing a provider this minimal wrapper
// lacks; its claim behavior is covered by ProfileAccountSection's own test.
jest.mock('@/features/paywall/ClaimSheet', () => ({ ClaimSheet: () => null }));
jest.mock('@/hooks/useProfile', () => ({
  profileKeys: { detail: (id: string) => ['profile', id] },
  useProfile: () => ({
    data: {
      user_id: 'user-1',
      name: 'Maya',
      self_description: 'restless in a good way',
      dream_city: 'Lisbon',
      dream_home: 'cozy-cottage',
      free_text_note: null,
    },
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ThemeProvider forceScheme="light">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}

describe('ProfileTab (product 11: trust center)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to the default: free + anonymous.
    mockEntitlement = { premium: false, inTrial: false, loading: false, info: null };
    mockAccount = { claimed: false, appleAvailable: false };
    mockedApi.fetchPeople.mockResolvedValue([
      {
        id: 'p1',
        user_id: 'user-1',
        name: 'Ivy',
        descriptor: 'safe',
        active: true,
        created_at: '',
        updated_at: '',
      },
    ]);
  });

  it('shows the control-center sections and a plan chip', async () => {
    const view = await render(<ProfileTab />, { wrapper });

    // Section labels are the "clearer" win.
    expect(await view.findByText(profileCopy.account.label)).toBeTruthy();
    expect(view.getByText(profileCopy.account.memoryLabel)).toBeTruthy();
    expect(view.getByText(profileCopy.account.trustLabel)).toBeTruthy();

    // Free + anonymous: the chip says Free and the secure-account row is present.
    expect(view.getByTestId('profile-plan-chip')).toBeTruthy();
    expect(view.getByText(profileCopy.account.plan.free)).toBeTruthy();
    expect(view.getByText(profileCopy.account.secure.title)).toBeTruthy();
  });

  it('maps a premium entitlement to the Premium chip through the real derivation', async () => {
    mockEntitlement = { premium: true, inTrial: false, loading: false, info: null };
    const view = await render(<ProfileTab />, { wrapper });

    expect(await view.findByText(profileCopy.account.plan.premium)).toBeTruthy();
    expect(view.queryByText(profileCopy.account.plan.free)).toBeNull();
  });

  it('hides "Secure your account" while the claim check is IN FLIGHT (claimed undefined)', async () => {
    // Guards the spec's `claimed === false` gate against a regression to `!claimed`,
    // which would wrongly show the row before the check settles.
    mockAccount = { claimed: undefined, appleAvailable: false };
    const view = await render(<ProfileTab />, { wrapper });

    await view.findByText(profileCopy.account.label);
    expect(view.queryByText(profileCopy.account.secure.title)).toBeNull();
  });

  it('hides "Secure your account" for a claimed (signed-in) account', async () => {
    mockAccount = { claimed: true, appleAvailable: false };
    const view = await render(<ProfileTab />, { wrapper });

    await view.findByText(profileCopy.account.label);
    expect(view.queryByText(profileCopy.account.secure.title)).toBeNull();
  });

  it('shows what Aura currently believes, field by field', async () => {
    const view = await render(<ProfileTab />, { wrapper });

    // Regex, not an exact string: v4 closes a title on an ember mark, and the
    // assertion is about her NAME being shown, not about the brand full stop.
    expect(await view.findByText(/Maya/)).toBeTruthy();
    expect(view.getByText('restless in a good way')).toBeTruthy();
    expect(view.getByText('Lisbon')).toBeTruthy();
  });

  it('lists her people with a remove that deactivates, never deletes', async () => {
    const view = await render(<ProfileTab />, { wrapper });
    mockedApi.deactivatePerson.mockResolvedValue(undefined);

    // The v4 row summarises her people; the list itself opens in a sheet.
    await fireEvent.press(await view.findByLabelText(profileCopy.rows.people));
    expect(view.getAllByText('Ivy — safe').length).toBeGreaterThan(0);
    await fireEvent.press(view.getByText(profileCopy.people.remove));

    expect(mockedApi.deactivatePerson).toHaveBeenCalledWith('p1');
  });

  it('opens the edit sheet and shows the memory contract after saving', async () => {
    mockedApi.updateProfileField.mockResolvedValue(undefined);
    const view = await render(<ProfileTab />, { wrapper });

    await fireEvent.press(await view.findByLabelText(profileCopy.rows.dreamCity));
    await fireEvent.changeText(view.getByDisplayValue('Lisbon'), 'Porto');
    await fireEvent.press(view.getByLabelText(profileCopy.edit.save));

    expect(mockedApi.updateProfileField).toHaveBeenCalledWith('user-1', 'dream_city', 'Porto');
    // "I'll write differently from now on" — the contract made visible (product 10 §44).
    expect(await view.findByText(profileCopy.edit.savedNote)).toBeTruthy();
  });

  it('routes the note through the free-text write path — it feeds memory', async () => {
    mockedApi.saveFreeTextNote.mockResolvedValue(undefined);
    const view = await render(<ProfileTab />, { wrapper });

    await fireEvent.press(await view.findByLabelText(profileCopy.rows.note));
    await fireEvent.changeText(view.getByDisplayValue(''), 'The bakery downstairs matters');
    await fireEvent.press(view.getByLabelText(profileCopy.edit.save));

    expect(mockedApi.saveFreeTextNote).toHaveBeenCalledWith(
      'user-1',
      'The bakery downstairs matters',
    );
  });
});
