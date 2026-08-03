import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { SkeletonList } from './SkeletonList';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// Like Skeleton, the list hides itself from assistive tech, so reaching it at
// all requires opting into hidden elements.
const hidden = { includeHiddenElements: true } as const;

describe('SkeletonList', () => {
  it('draws the requested number of placeholder rows', async () => {
    await render(<SkeletonList rows={5} testID="loading" />, { wrapper });

    const block = screen.getByTestId('loading', hidden);
    expect(block.children).toHaveLength(5);
  });

  it('defaults to four rows', async () => {
    await render(<SkeletonList testID="loading" />, { wrapper });

    expect(screen.getByTestId('loading', hidden).children).toHaveLength(4);
  });

  it('is hidden from assistive tech — placeholders carry no information', async () => {
    await render(<SkeletonList testID="loading" />, { wrapper });

    expect(screen.queryByTestId('loading')).toBeNull();
    expect(screen.getByTestId('loading', hidden).props.accessibilityElementsHidden).toBe(true);
  });
});
