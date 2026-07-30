import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { colorSchemes } from '@/theme/tokens';

import { TabBar, type TabBarProps } from './TabBar';

// The bar reads insets directly; the official mock supplies zeroed metrics
// without the native provider.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

/** The four product tabs (06 §6) as a fabricated react-navigation state. */
function makeProps(overrides: { index?: number; defaultPrevented?: boolean } = {}): TabBarProps & {
  navigation: { emit: jest.Mock; navigate: jest.Mock };
} {
  const routes = [
    { key: 'home-1', name: 'home' },
    { key: 'affirmations-1', name: 'affirmations' },
    { key: 'gratitude-1', name: 'gratitude' },
    { key: 'profile-1', name: 'profile' },
  ];

  return {
    state: { index: overrides.index ?? 0, routes },
    descriptors: {
      'home-1': { options: { title: 'Home' } },
      'affirmations-1': { options: { title: 'Affirmations' } },
      'gratitude-1': { options: { title: 'Gratitude' } },
      'profile-1': { options: {} },
    },
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: overrides.defaultPrevented ?? false })),
      navigate: jest.fn(),
    },
  };
}

function iconColor(tab: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(`tab-icon-${tab}`).props.style).color;
}

const light = colorSchemes.light;

describe('TabBar', () => {
  it('renders one icon and its label per route', async () => {
    await render(<TabBar {...makeProps()} />, { wrapper });

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    for (const tab of ['home', 'affirmations', 'gratitude', 'profile']) {
      expect(screen.getByTestId(`tab-icon-${tab}`)).toBeTruthy();
    }
    // WhatsApp-style: each tab carries a visible caption under its glyph.
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Gratitude')).toBeTruthy();
  });

  it('keeps the title on the accessibility label once the caption is gone', async () => {
    // Dropping the visible text must not drop the NAME. Without this, an
    // icon-only bar is four unlabelled buttons to VoiceOver.
    await render(<TabBar {...makeProps()} />, { wrapper });

    expect(screen.getByTestId('tab-home').props.accessibilityLabel).toBe('Home');
    // profile has no title option — route name stands in.
    expect(screen.getByTestId('tab-profile').props.accessibilityLabel).toBe('profile');
  });

  it('fills the active glyph ember and leaves the rest dark ink', async () => {
    await render(<TabBar {...makeProps({ index: 0 })} />, { wrapper });

    expect(iconColor('home')).toBe(light.accent.emberDeep);
    expect(iconColor('gratitude')).toBe(light.text.primary);
  });

  it('moves the active mark when the active index moves', async () => {
    await render(<TabBar {...makeProps({ index: 2 })} />, { wrapper });

    expect(iconColor('home')).toBe(light.text.primary);
    expect(iconColor('gratitude')).toBe(light.accent.emberDeep);
  });

  it('reports selection to assistive tech', async () => {
    await render(<TabBar {...makeProps({ index: 1 })} />, { wrapper });

    expect(screen.getByTestId('tab-affirmations').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId('tab-home').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('emits tabPress and navigates on pressing an inactive tab', async () => {
    const props = makeProps({ index: 0 });
    await render(<TabBar {...props} />, { wrapper });

    fireEvent.press(screen.getByTestId('tab-gratitude'));

    expect(props.navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'gratitude-1',
      canPreventDefault: true,
    });
    expect(props.navigation.navigate).toHaveBeenCalledWith('gratitude');
  });

  it('does not navigate when the screen prevents default', async () => {
    const props = makeProps({ index: 0, defaultPrevented: true });
    await render(<TabBar {...props} />, { wrapper });

    fireEvent.press(screen.getByTestId('tab-gratitude'));

    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('does not re-navigate to the already-focused tab', async () => {
    const props = makeProps({ index: 0 });
    await render(<TabBar {...props} />, { wrapper });

    fireEvent.press(screen.getByTestId('tab-home'));

    // The press still emits — the screen may want scroll-to-top — but no navigation.
    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });
});
