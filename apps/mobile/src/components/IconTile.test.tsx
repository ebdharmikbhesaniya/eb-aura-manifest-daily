import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { IconTile } from './IconTile';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('IconTile', () => {
  it('renders a wash tile with its glyph', async () => {
    await render(<IconTile tint="bone" glyph="✕" testID="tile" />, { wrapper });

    expect(screen.getByTestId('tile')).toBeTruthy();
    // The glyph is decoration, hidden from assistive tech on purpose.
    expect(screen.getByText('✕', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders the orb gradient tile', async () => {
    await render(<IconTile tint="orb" testID="orb-tile" />, { wrapper });

    expect(screen.getByTestId('orb-tile')).toBeTruthy();
  });
});
