import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { StreakCard } from './StreakCard';
import type { StreakState } from './streak';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

const week = [true, true, true, false, false, false, false];

function state(current: number, longest = current): StreakState {
  return {
    current,
    longest,
    lastCountedDay: '2026-08-20',
    heldDaysUsed: 0,
    heldMonth: '2026-08',
    countedDays: ['2026-08-20'],
  };
}

describe('StreakCard', () => {
  /** A zero on the first morning is discouragement, not information. */
  it('renders nothing before she has counted a single day', async () => {
    const view = await render(
      <StreakCard state={state(0, 0)} week={week} lastOutcome={null} testID="streak" />,
      { wrapper },
    );

    expect(view.queryByTestId('streak')).toBeNull();
  });

  it('shows the count and the label', async () => {
    await render(<StreakCard state={state(12)} week={week} lastOutcome={null} testID="streak" />, {
      wrapper,
    });

    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('days becoming')).toBeTruthy();
  });

  it('stays quiet about the longest run while it equals the current one', async () => {
    await render(
      <StreakCard state={state(12, 12)} week={week} lastOutcome={null} testID="streak" />,
      { wrapper },
    );

    expect(screen.queryByTestId('streak-note')).toBeNull();
  });

  it('shows the longest run once it is genuinely ahead', async () => {
    await render(
      <StreakCard state={state(3, 34)} week={week} lastOutcome={null} testID="streak" />,
      { wrapper },
    );

    expect(screen.getByText('Longest yet: 34')).toBeTruthy();
  });

  /** The line that makes a loss state survivable — her work is not erased. */
  it('says the past still happened after a reset', async () => {
    await render(
      <StreakCard state={state(1, 34)} week={week} lastOutcome="reset" testID="streak" />,
      { wrapper },
    );

    expect(screen.getByText('Back to day one. Your 34 days still happened.')).toBeTruthy();
  });

  it('names no failure when grace covered a day', async () => {
    await render(
      <StreakCard state={state(10, 10)} week={week} lastOutcome="held" testID="streak" />,
      { wrapper },
    );

    expect(screen.getByText('Yesterday stayed open. I kept your place.')).toBeTruthy();
  });

  /** "1 days becoming" is the kind of thing that ships and then embarrasses. */
  it('uses the singular label on day one', async () => {
    await render(
      <StreakCard state={state(1, 1)} week={week} lastOutcome="extended" testID="streak" />,
      { wrapper },
    );

    expect(screen.getByText('day becoming')).toBeTruthy();
    expect(screen.queryByText('days becoming')).toBeNull();
  });

  it('greets day one as an invitation', async () => {
    await render(
      <StreakCard state={state(1, 1)} week={week} lastOutcome="extended" testID="streak" />,
      { wrapper },
    );

    expect(screen.getByText('Day one. Again is allowed.')).toBeTruthy();
  });

  it('opens the history on press', async () => {
    const onPress = jest.fn();
    await render(
      <StreakCard
        state={state(12)}
        week={week}
        lastOutcome={null}
        onPress={onPress}
        testID="streak"
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByTestId('streak'));

    expect(onPress).toHaveBeenCalled();
  });
});
