import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

import { Screen } from './Screen';

// The gradient is a native view manager with no jest implementation; a plain
// View keeps the tree renderable while the colors stay on props for assertion.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
  };
});

// Real provider with synchronous metrics — the native measurement never
// arrives under jest, and without metrics SafeAreaView renders nothing.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

/** The safe-area container is the gradient's only child. */
function content() {
  const gradient = screen.getByTestId('screen');
  const [child] = gradient.children;
  if (!child || typeof child === 'string') {
    throw new Error('expected the safe-area container');
  }
  return child;
}

function contentStyle() {
  return StyleSheet.flatten(content().props.style);
}

describe('Screen', () => {
  it('renders its children on the gradient', async () => {
    await render(
      <Screen testID="screen">
        <Text>Today's Moment</Text>
      </Screen>,
      { wrapper },
    );

    expect(screen.getByText("Today's Moment")).toBeTruthy();
    expect(screen.getByTestId('screen')).toBeTruthy();
  });

  it('applies the standard screen margin by default (product 12)', async () => {
    await render(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
      { wrapper },
    );

    expect(contentStyle()).toMatchObject({ paddingHorizontal: layout.screenMargin });
  });

  it('drops the margin when edge-to-edge — covers own their surface', async () => {
    await render(
      <Screen testID="screen" edgeToEdge>
        <Text>cover</Text>
      </Screen>,
      { wrapper },
    );

    expect(contentStyle().paddingHorizontal).toBeUndefined();
  });

  it('pads every safe-area edge by default', async () => {
    await render(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
      { wrapper },
    );

    // The library normalises the edge list into a per-edge mode map.
    expect(content().props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
  });

  it('releases the top edge for a screen that scrolls under the status bar', async () => {
    // The released inset does not vanish — the screen re-applies it as CONTENT
    // padding, which is the difference between a list that travels under the
    // status bar and one guillotined at the container's edge. The bottom stays
    // held: nothing scrolls out through the home indicator.
    await render(
      <Screen testID="screen" scrollsUnderStatusBar>
        <Text>content</Text>
      </Screen>,
      { wrapper },
    );

    expect(content().props.edges).toMatchObject({ top: 'off', bottom: 'additive' });
  });

  it('merges a caller style into the content container', async () => {
    await render(
      <Screen testID="screen" style={{ justifyContent: 'center' }}>
        <Text>content</Text>
      </Screen>,
      { wrapper },
    );

    expect(contentStyle()).toMatchObject({
      justifyContent: 'center',
      paddingHorizontal: layout.screenMargin,
    });
  });
});
