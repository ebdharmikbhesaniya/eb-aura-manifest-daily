import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Input } from './Input';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Input', () => {
  it('renders its value', async () => {
    await render(<Input value="First client signed" onChangeText={jest.fn()} />, { wrapper });

    expect(screen.getByDisplayValue('First client signed')).toBeTruthy();
  });

  it('reports edits through onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<Input value="" onChangeText={onChangeText} testID="field" />, { wrapper });

    fireEvent.changeText(screen.getByTestId('field'), 'my coffee this morning');

    expect(onChangeText).toHaveBeenCalledWith('my coffee this morning');
  });

  it('shows the gentle hint copy when provided (product 12: no validation reds)', async () => {
    await render(
      <Input value="" onChangeText={jest.fn()} hint="A few more words helps me write for you" />,
      { wrapper },
    );

    expect(screen.getByText('A few more words helps me write for you')).toBeTruthy();
  });

  it('renders no hint copy when none is given', async () => {
    await render(<Input value="" onChangeText={jest.fn()} placeholder="One line" />, { wrapper });

    expect(screen.queryByText(/./)).toBeNull();
  });

  /**
   * The bug this guards: `typography.body` carries 15/24 leading, and iOS lays a
   * single-line TextInput's glyphs against the BOTTOM of that 24pt line box
   * rather than its middle — so the text sat visibly low in the field. Dropping
   * the leading is only correct for single-line; multiline needs it.
   */
  it('drops paragraph leading on a single-line field so the text centres', async () => {
    await render(<Input value="Dharmik" onChangeText={jest.fn()} testID="field" />, { wrapper });

    const style = StyleSheet.flatten(screen.getByTestId('field').props.style);

    expect(style.lineHeight).toBeUndefined();
    expect(style.textAlignVertical).toBe('center');
    // A fixed height, not padding, so the box the platform centres in is known.
    expect(style.height).toBe(50);
    expect(style.paddingVertical).toBe(0);
  });

  it('keeps leading and top alignment on a multiline field', async () => {
    await render(<Input value="" onChangeText={jest.fn()} multiline testID="field" />, { wrapper });

    const style = StyleSheet.flatten(screen.getByTestId('field').props.style);

    expect(style.lineHeight).toBe(24);
    expect(style.textAlignVertical).toBe('top');
    // Opens at three lines — a composer that opens one line tall reads as a
    // single-line field.
    expect(style.minHeight).toBe(96);
    expect(style.height).toBeUndefined();
  });
});
