import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { captureException } from '@/lib/analytics';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { AppErrorBoundary } from './AppErrorBoundary';

jest.mock('@/lib/analytics', () => ({
  captureException: jest.fn(),
}));

const mockedCapture = captureException as jest.MockedFunction<typeof captureException>;

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

/** A child that throws on first render, then renders fine after `reset()`. */
function Boom({ shouldThrow }: { shouldThrow: boolean }): ReactNode {
  if (shouldThrow) throw new Error('kaboom');
  return <Text>recovered</Text>;
}

describe('AppErrorBoundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports a render error to PostHog and shows the calm fallback', async () => {
    // React logs the caught error to console.error; silence it for a clean run.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await render(
      <AppErrorBoundary>
        <Boom shouldThrow />
      </AppErrorBoundary>,
      { wrapper },
    );

    expect(screen.getByTestId('app-error-fallback')).toBeTruthy();
    expect(mockedCapture).toHaveBeenCalledWith(expect.any(Error), { boundary: 'root' });
    spy.mockRestore();
  });

  it('renders children normally when nothing throws', async () => {
    await render(
      <AppErrorBoundary>
        <Boom shouldThrow={false} />
      </AppErrorBoundary>,
      { wrapper },
    );

    expect(screen.getByText('recovered')).toBeTruthy();
    expect(mockedCapture).not.toHaveBeenCalled();
  });
});
