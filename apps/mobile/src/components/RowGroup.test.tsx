import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { ListRow } from './ListRow';
import { RowGroup } from './RowGroup';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('RowGroup', () => {
  it('renders every row it is given', async () => {
    await render(
      <RowGroup>
        <ListRow title="Basics" onPress={jest.fn()} />
        <ListRow title="Your dream" onPress={jest.fn()} />
        <ListRow title="Your people" onPress={jest.fn()} />
      </RowGroup>,
      { wrapper },
    );

    expect(screen.getByText('Basics')).toBeTruthy();
    expect(screen.getByText('Your dream')).toBeTruthy();
    expect(screen.getByText('Your people')).toBeTruthy();
  });

  it('skips conditional rows that render nothing', async () => {
    await render(
      <RowGroup testID="group">
        <ListRow title="Basics" onPress={jest.fn()} />
        {false}
        <ListRow title="Your people" onPress={jest.fn()} />
      </RowGroup>,
      { wrapper },
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
