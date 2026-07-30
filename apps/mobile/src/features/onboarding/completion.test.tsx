import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { completeOnboarding } from './commit';
import { onboardingCopy } from '@/copy/onboarding';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';

import { S11ArrivalTime } from './screens/S11ArrivalTime';
import { S12Notifications } from './screens/S12Notifications';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('./commit', () => ({
  submitAnswer: jest.fn(async () => undefined),
  completeOnboarding: jest.fn(async () => undefined),
  flushPending: jest.fn(async () => true),
}));
jest.mock('@/features/notifications/useNotifications', () => ({
  requestPermissionAndRegister: jest.fn(async () => ({ granted: true, registered: true })),
}));
jest.mock('@/features/notifications/permissionGate', () => ({
  markPermissionAsked: jest.fn(),
}));
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

  describe('S11 arrival time — advances into the permission step, does not finish', () => {
    const advance = async () => {
      const view = await render(<S11ArrivalTime />, { wrapper });
      // Continue is disabled until she picks an arrival time.
      await fireEvent.press(view.getByText(onboardingCopy.s11ArrivalTime.morning));
      await fireEvent.press(view.getByText(onboardingCopy.s11ArrivalTime.primary));
      return view;
    };

    it('pushes on to s12-notifications rather than completing here', async () => {
      await advance();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/s12-notifications'));
      expect(completeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('S12 notifications — the true finish', () => {
    const finish = async (control: string) => {
      const view = await render(<S12Notifications />, { wrapper });
      await fireEvent.press(view.getByText(control));
      return view;
    };

    it('asks the OS and records it when she turns reminders on', async () => {
      await finish(onboardingCopy.s12Notifications.primary);

      await waitFor(() => expect(requestPermissionAndRegister).toHaveBeenCalledWith('user-1'));
      expect(markPermissionAsked).toHaveBeenCalledWith(true);
    });

    it('does not ask the OS when she taps "Maybe later" — Home stays the fallback', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
      expect(requestPermissionAndRegister).not.toHaveBeenCalled();
      expect(markPermissionAsked).not.toHaveBeenCalled();
    });

    it('stamps the profile as completed', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
    });

    it('goes straight into the generation ritual', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/generating'));
    });

    it('never routes to Home first — that would spend the setup S10 just built', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
      expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/home');
    });

    it('replaces rather than pushes, so a back-swipe cannot reopen the conversation', async () => {
      await finish(onboardingCopy.s12Notifications.skip);

      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
