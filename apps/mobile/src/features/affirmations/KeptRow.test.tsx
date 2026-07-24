import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { KeptRow } from './KeptRow';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

describe('KeptRow (v4 §saved)', () => {
  it('sets her words in curly quotes', async () => {
    await render(<KeptRow text="I am steady in my work" />, { wrapper });

    expect(screen.getByText('“I am steady in my work”')).toBeTruthy();
  });

  it('marks the row with a heart the screen reader skips', async () => {
    // The heart is decoration on a row whose text already says what it is —
    // announcing "black heart suit" before every kept line is noise. It is
    // drawn, but it is out of the accessibility tree, so the default query
    // (which honours that tree) must not see it.
    await render(<KeptRow text="I am enough" />, { wrapper });

    expect(screen.getByText('♥', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('♥')).toBeNull();
  });

  it('holds its type size when the OS font scale is cranked', async () => {
    // Her own words are set in the voice serif at a measured size; letting the
    // system rescale them reflows the card the whole §saved language depends on.
    await render(<KeptRow text="I am enough" />, { wrapper });

    expect(screen.getByText('“I am enough”').props.allowFontScaling).toBe(false);
  });
});
