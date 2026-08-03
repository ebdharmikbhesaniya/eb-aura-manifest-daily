import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { ProfilePlanChip } from './ProfilePlanChip';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

describe('ProfilePlanChip', () => {
  it('renders its label', async () => {
    await render(<ProfilePlanChip label="Premium" tint="accent" onPress={() => {}} />, { wrapper });
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('fires onPress', async () => {
    const onPress = jest.fn();
    await render(<ProfilePlanChip label="Free" tint="neutral" onPress={onPress} />, { wrapper });
    fireEvent.press(screen.getByText('Free'));
    expect(onPress).toHaveBeenCalled();
  });
});
