import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { ConversationScreen } from './ConversationScreen';

// `mock`-prefixed so jest's out-of-scope guard allows the factory to close over it.
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

/**
 * The back chevron (product 07 "revise, never restart" — and its edge).
 *
 * The guard lists ANSWERED screens only. S1 and S2 carry no answer, so on S3 —
 * the first screen that asks for anything — the guard had nothing to list and
 * opened onto an empty sheet. The chevron promised a way back and delivered a
 * dead end, which is exactly how a resumed draft left people stranded on step 3
 * with no route to steps 1 and 2.
 */
describe('ConversationScreen back chevron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingDraft.getState().reset();
  });

  it('steps back to the previous screen when nothing is answered yet', async () => {
    await render(<ConversationScreen screenId="s03-name" question="What should I call you?" />, {
      wrapper,
    });

    fireEvent.press(screen.getByLabelText(onboardingCopy.editGuard.back));

    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/s02-meet-aura');
  });

  it('moves the draft back too, so a resume does not jump forward again', async () => {
    await render(<ConversationScreen screenId="s03-name" question="What should I call you?" />, {
      wrapper,
    });

    fireEvent.press(screen.getByLabelText(onboardingCopy.editGuard.back));

    expect(useOnboardingDraft.getState().currentScreen).toBe('s02-meet-aura');
  });

  it('opens the edit guard once there IS an answer to revise', async () => {
    useOnboardingDraft.getState().setAnswer('s03-name', 'Maya');

    await render(
      <ConversationScreen screenId="s05-work-feeling" question="How does work feel?" />,
      { wrapper },
    );

    // Finding the chevron by THIS label is half the assertion: the two branches
    // announce themselves differently, so this only resolves on the guard path.
    fireEvent.press(screen.getByLabelText(onboardingCopy.editGuard.entry));

    // The guard, not a raw pop — revise, never restart.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useOnboardingDraft.getState().currentScreen).not.toBe('s04-self-description');
  });
});
