import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { PlayCircle } from './PlayCircle';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('PlayCircle', () => {
  it('shows the play glyph when idle and pause when playing', async () => {
    const { rerender } = await render(
      <PlayCircle accessibilityLabel="Play" onPress={jest.fn()} />,
      { wrapper },
    );
    // The glyph is decoration, hidden from assistive tech; the button label speaks.
    expect(screen.getByText('▶', { includeHiddenElements: true })).toBeTruthy();

    await rerender(<PlayCircle playing accessibilityLabel="Pause" onPress={jest.fn()} />);
    expect(screen.getByText('❙❙', { includeHiddenElements: true })).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<PlayCircle accessibilityLabel="Play" onPress={onPress} />, { wrapper });

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
