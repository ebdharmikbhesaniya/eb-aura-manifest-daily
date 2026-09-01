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
  getFeatureFlag: () => undefined,
  onFeatureFlags: () => () => {},
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

/**
 * The back circle (product 07 "revise, never restart" — and its edge).
 *
 * The guard lists ANSWERED screens only. Before anything is answered it had
 * nothing to list, so back simply steps back; once there is an answer, back
 * opens the guard.
 */
describe('ConversationScreen header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingDraft.getState().reset();
  });

  it('steps back over bypassed screens when nothing is answered yet', async () => {
    await render(<ConversationScreen screenId="s03-name" question="What should I call you?" />, {
      wrapper,
    });

    fireEvent.press(screen.getByLabelText(onboardingCopy.editGuard.back));

    // No goals yet → priority is bypassed; context (default variant) is not.
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/q-context');
    expect(useOnboardingDraft.getState().currentScreen).toBe('q-context');
  });

  it('opens the edit guard once there IS an answer to revise', async () => {
    useOnboardingDraft.getState().setAnswer('s03-name', 'Maya');

    await render(<ConversationScreen screenId="a05-feeling" question="How has it been?" />, {
      wrapper,
    });

    fireEvent.press(screen.getByLabelText(onboardingCopy.editGuard.entry));

    // The guard, not a raw pop — revise, never restart.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('offers Skip only on the skippable questions', async () => {
    const onSkip = jest.fn();
    const skippable = await render(
      <ConversationScreen screenId="q-context" question="Where are you?" onSkip={onSkip} />,
      { wrapper },
    );
    fireEvent.press(skippable.getByText(onboardingCopy.header.skip));
    expect(onSkip).toHaveBeenCalled();

    const notSkippable = await render(
      <ConversationScreen screenId="a05-feeling" question="How has it been?" onSkip={onSkip} />,
      { wrapper },
    );
    expect(notSkippable.queryByText(onboardingCopy.header.skip)).toBeNull();
  });

  it('draws no track on the screens outside the conversation', async () => {
    const view = await render(<ConversationScreen screenId="a02-value" question="Why" />, {
      wrapper,
    });
    expect(view.queryByRole('progressbar')).toBeNull();
  });
});
