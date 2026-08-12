import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EXPERIMENTS } from './keys';
import { useFeatureFlag, useVariant } from './useVariant';

jest.mock('@/lib/analytics', () => ({
  getFeatureFlag: jest.fn(),
  onFeatureFlags: jest.fn(() => () => {}),
}));

const { getFeatureFlag, onFeatureFlags } = jest.requireMock('@/lib/analytics') as {
  getFeatureFlag: jest.Mock;
  onFeatureFlags: jest.Mock;
};

const VARIANTS = ['control', 'steps'] as const;

function VariantProbe() {
  const variant = useVariant(EXPERIMENTS.paywallLayout, 'control', VARIANTS);
  return <Text>{variant}</Text>;
}

function FlagProbe() {
  const enabled = useFeatureFlag(EXPERIMENTS.homeFirstRun);
  return <Text>{enabled ? 'on' : 'off'}</Text>;
}

describe('useVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onFeatureFlags.mockReturnValue(() => {});
  });

  it('shows the fallback (control) when no flag is set — never breaks a screen', async () => {
    getFeatureFlag.mockReturnValue(undefined);

    await render(<VariantProbe />);

    expect(screen.getByText('control')).toBeTruthy();
  });

  it('shows the assigned variant when the flag matches a known one', async () => {
    getFeatureFlag.mockReturnValue('steps');

    await render(<VariantProbe />);

    expect(screen.getByText('steps')).toBeTruthy();
  });

  it('falls back to control for an unknown flag value', async () => {
    getFeatureFlag.mockReturnValue('mystery');

    await render(<VariantProbe />);

    expect(screen.getByText('control')).toBeTruthy();
  });

  it('subscribes to flag updates so a late-arriving variant can apply', async () => {
    getFeatureFlag.mockReturnValue(undefined);

    await render(<VariantProbe />);

    // The hook registered for async flag delivery (PostHog loads flags after
    // boot); the read-and-apply is exercised by the fallback/assigned cases.
    expect(onFeatureFlags).toHaveBeenCalled();
  });
});

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onFeatureFlags.mockReturnValue(() => {});
  });

  it('is off unless the flag is exactly true', async () => {
    getFeatureFlag.mockReturnValue(undefined);

    await render(<FlagProbe />);

    expect(screen.getByText('off')).toBeTruthy();
  });

  it('is on when the flag is true', async () => {
    getFeatureFlag.mockReturnValue(true);

    await render(<FlagProbe />);

    expect(screen.getByText('on')).toBeTruthy();
  });
});
