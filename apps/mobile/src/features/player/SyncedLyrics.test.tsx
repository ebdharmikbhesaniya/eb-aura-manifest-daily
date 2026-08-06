import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import type { KaraokeLine } from '@/features/letter/karaoke';
import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { SyncedLyrics } from './SyncedLyrics';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

const LINES: KaraokeLine[] = [
  { index: 0, text: 'the first evening', words: [], startMs: 0, endMs: 900 },
  { index: 1, text: 'it feels easy', words: [], startMs: 900, endMs: 1800 },
];

function Harness() {
  const positionMs = useSharedValue(0);
  return <SyncedLyrics lines={LINES} positionMs={positionMs} testID="synced" />;
}

const hidden = { includeHiddenElements: true } as const;

describe('SyncedLyrics', () => {
  it('renders every line of the moment', async () => {
    await render(<Harness />, { wrapper });

    expect(screen.getByText('the first evening')).toBeTruthy();
    expect(screen.getByText('it feels easy')).toBeTruthy();
  });

  it('exposes its container by testID', async () => {
    await render(<Harness />, { wrapper });
    expect(screen.getByTestId('synced', hidden)).toBeTruthy();
  });
});
