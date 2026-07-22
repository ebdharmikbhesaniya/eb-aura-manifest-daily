import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { ListRow } from './ListRow';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ListRow', () => {
  it('renders title and subtitle', async () => {
    await render(<ListRow title="Basics" subtitle="Maya · mornings" onPress={jest.fn()} />, {
      wrapper,
    });

    expect(screen.getByText('Basics')).toBeTruthy();
    expect(screen.getByText('Maya · mornings')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Basics" onPress={onPress} />, { wrapper });

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the chevron affordance by default', async () => {
    await render(<ListRow title="Basics" onPress={jest.fn()} />, { wrapper });

    // The chevron is decoration, hidden from assistive tech on purpose.
    expect(screen.getByText('›', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders a custom trailing node instead of the chevron', async () => {
    await render(<ListRow title="Notifications" trailing={<Text>toggle</Text>} />, { wrapper });

    expect(screen.getByText('toggle')).toBeTruthy();
    expect(screen.queryByText('›', { includeHiddenElements: true })).toBeNull();
  });
});
