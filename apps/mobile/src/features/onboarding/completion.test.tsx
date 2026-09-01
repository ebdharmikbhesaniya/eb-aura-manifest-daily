import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import type { ReactNode } from 'react';

import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { completeOnboarding } from './commit';
import { onboardingCopy } from '@/copy/onboarding';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';

import { A08RitualTime } from './screens/A08RitualTime';
import { S12Notifications } from './screens/S12Notifications';
import { S12NotificationsMore } from './screens/S12NotificationsMore';
import { VConsent } from './screens/VConsent';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
  getFeatureFlag: () => undefined,
  onFeatureFlags: () => () => {},
}));
jest.mock('./commit', () => ({
  submitAnswer: jest.fn(async () => undefined),
  completeOnboarding: jest.fn(async () => undefined),
  flushPending: jest.fn(async () => true),
}));
jest.mock('@/features/notifications/useNotifications', () => ({
  requestPermissionAndRegister: jest.fn(async () => ({ granted: true, registered: true })),
  registerToken: jest.fn(async () => true),
}));
jest.mock('@/features/notifications/permissionGate', () => ({
  markPermissionAsked: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', canAskAgain: true })),
}));

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermission = requestPermissionAndRegister as jest.Mock;
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

/**
 * The seam between the conversation and the wow (product 07 S12, 08 §1).
 *
 * The conversation's last screen is the notification pre-prompt; the consent
 * hands off TO it rather than finishing. The pre-prompt (or its second chance)
 * is what stamps completion and goes straight into the ritual — nothing (no
 * Home, no interstitial) between the last step and the Letter.
 */
describe('finishing the conversation', () => {
  beforeEach(() => {
    useOnboardingDraft.getState().reset();
    jest.clearAllMocks();
  });

  describe('Q11 ritual time — names the time in the button, then moves on', () => {
    it('gates Continue until she picks, then labels it with the preset time', async () => {
      const view = await render(<A08RitualTime />, { wrapper });
      const first = onboardingCopy.a08RitualTime.choices[0]!;
      const label = onboardingCopy.a08RitualTime.primary.replace('{time}', first.time);

      expect(view.getByLabelText(label).props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(view.getByText(first.label));
      await fireEvent.press(view.getByText(label));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/v-gratitude'));
      expect(completeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('AI consent — records the choice and hands off to the pre-prompt', () => {
    it('"Yes, write mine" pushes to notifications without finishing', async () => {
      const view = await render(<VConsent />, { wrapper });

      await fireEvent.press(view.getByText(onboardingCopy.vConsent.primary));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/s12-notifications'));
      expect(completeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('S12 notifications — grant finishes, decline gets a second chance', () => {
    const finish = async (control: string) => {
      const view = await render(<S12Notifications />, { wrapper });
      await fireEvent.press(view.getByText(control));
      return view;
    };

    it('when she grants: records it, stamps completion, and enters the ritual', async () => {
      await finish(onboardingCopy.s12Notifications.primary);

      await waitFor(() => expect(requestPermissionAndRegister).toHaveBeenCalledWith('user-1'));
      expect(markPermissionAsked).toHaveBeenCalledWith(true);
      await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
      expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/generating');
    });

    it('never routes to Home first on the grant path', async () => {
      await finish(onboardingCopy.s12Notifications.primary);

      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
      expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/home');
    });

    it('when the OS is declined: offers the second chance, does not finish yet', async () => {
      mockRequestPermission.mockResolvedValueOnce({ granted: false, registered: false });

      await finish(onboardingCopy.s12Notifications.primary);

      await waitFor(() =>
        expect(mockPush).toHaveBeenCalledWith('/(onboarding)/s12b-notifications'),
      );
      expect(completeOnboarding).not.toHaveBeenCalled();
      expect(markPermissionAsked).not.toHaveBeenCalled();
    });

    it('"Not now" offers the second chance rather than dropping the loop', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() =>
        expect(mockPush).toHaveBeenCalledWith('/(onboarding)/s12b-notifications'),
      );
      expect(requestPermissionAndRegister).not.toHaveBeenCalled();
      expect(completeOnboarding).not.toHaveBeenCalled();
    });

    it('previews the reminder at the time she chose', async () => {
      useOnboardingDraft.getState().setAnswer('a08-ritual-time', 'evening');
      const view = await render(<S12Notifications />, { wrapper });

      expect(view.getAllByText(/8:00pm/).length).toBeGreaterThan(0);
    });
  });

  describe('S12b notifications — the warm second chance', () => {
    const render12b = async () => render(<S12NotificationsMore />, { wrapper });

    it('"Continue without them" finishes: records the ask and enters the ritual', async () => {
      const view = await render12b();

      await fireEvent.press(view.getByText(onboardingCopy.s12NotificationsMore.skip));

      await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
      expect(markPermissionAsked).toHaveBeenCalledWith(true);
      expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/generating');
    });

    it('re-asks the OS and finishes when it can still be prompted', async () => {
      const view = await render12b();

      await fireEvent.press(view.getByText(onboardingCopy.s12NotificationsMore.primary));

      await waitFor(() => expect(requestPermissionAndRegister).toHaveBeenCalledWith('user-1'));
      await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
      expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/generating');
    });

    it('opens Settings (not the OS prompt) once she has already denied it', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'denied', canAskAgain: false });
      const openSettings = jest
        .spyOn(Linking, 'openSettings')
        .mockResolvedValue(undefined as never);

      const view = await render12b();

      const button = await view.findByText(onboardingCopy.s12NotificationsMore.openSettings);
      await fireEvent.press(button);

      await waitFor(() => expect(openSettings).toHaveBeenCalled());
      expect(requestPermissionAndRegister).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalledWith('/(onboarding)/generating');

      openSettings.mockRestore();
    });
  });
});
