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
import { A10Commitment } from './screens/A10Commitment';
import { A11Affirmation } from './screens/A11Affirmation';
import { A12Reminder } from './screens/A12Reminder';
import { S12Notifications } from './screens/S12Notifications';
import { S12NotificationsMore } from './screens/S12NotificationsMore';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
  // useVariant (onboarding experiments) reads these; default = control fallback.
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
 * Since 2026-07-30 the conversation's last screen is the notification-permission
 * step (s12-notifications). S11 (arrival time) now hands off TO it rather than
 * finishing; S12 is what stamps completion and goes straight into the ritual —
 * still with nothing (no Home, no interstitial) between the last step and the
 * Letter. This suite guards both halves of that seam.
 */
describe('finishing the conversation', () => {
  beforeEach(() => {
    useOnboardingDraft.getState().reset();
    jest.clearAllMocks();
  });

  describe('A08 ritual time — advances into the commitment beat, does not finish', () => {
    const advance = async () => {
      const view = await render(<A08RitualTime />, { wrapper });
      // Continue is disabled until she picks a time.
      await fireEvent.press(view.getByText(onboardingCopy.a08RitualTime.choices.morning.label));
      await fireEvent.press(view.getByText(onboardingCopy.a08RitualTime.primary));
      return view;
    };

    it('pushes on to the commitment beat rather than completing here', async () => {
      await advance();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/a10-commitment'));
      expect(completeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('A10 commitment — the readiness beat', () => {
    it('advances to the first affirmation on "Yes, I’m ready", without finishing', async () => {
      const view = await render(<A10Commitment />, { wrapper });

      await fireEvent.press(view.getByText(onboardingCopy.a10Commitment.primary));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/a11-affirmation'));
      expect(completeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('A11 first affirmation — a value beat before the ask', () => {
    it('advances to the reminder pre-prompt on "This resonates"', async () => {
      const view = await render(<A11Affirmation />, { wrapper });

      await fireEvent.press(view.getByText(onboardingCopy.a11Affirmation.primary));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/a12-reminder'));
      expect(completeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('A12 reminder pre-prompt — the education beat', () => {
    it('advances to the OS ask on Continue, without finishing onboarding', async () => {
      const view = await render(<A12Reminder />, { wrapper });

      await fireEvent.press(view.getByText(onboardingCopy.a12Reminder.primary));

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
      // Default mock grants.
      await finish(onboardingCopy.s12Notifications.primary);

      await waitFor(() => expect(requestPermissionAndRegister).toHaveBeenCalledWith('user-1'));
      expect(markPermissionAsked).toHaveBeenCalledWith(true);
      await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
      expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/generating');
    });

    it('never routes to Home first on the grant path (that would spend S10)', async () => {
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

    it('"Maybe later" offers the second chance rather than dropping the loop', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() =>
        expect(mockPush).toHaveBeenCalledWith('/(onboarding)/s12b-notifications'),
      );
      expect(requestPermissionAndRegister).not.toHaveBeenCalled();
      expect(completeOnboarding).not.toHaveBeenCalled();
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
      // Default getPermissions: undetermined + canAskAgain.
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

      // The primary flips to the Settings label once canAskAgain resolves false.
      const button = await view.findByText(onboardingCopy.s12NotificationsMore.openSettings);
      await fireEvent.press(button);

      await waitFor(() => expect(openSettings).toHaveBeenCalled());
      expect(requestPermissionAndRegister).not.toHaveBeenCalled();
      // Staying put — the AppState listener finishes if she enables it in Settings.
      expect(mockReplace).not.toHaveBeenCalledWith('/(onboarding)/generating');

      openSettings.mockRestore();
    });
  });
});
