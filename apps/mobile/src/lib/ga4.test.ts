// jest-expo's Constants.expoConfig is not writable, so mock a mutable one the
// test can drive per case.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { buildEnv: undefined } } },
}));

import { logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import Constants from 'expo-constants';

import { initGa4, isGa4Enabled, logGa4Event } from './ga4';

const mockLogEvent = logEvent as jest.Mock;
const mockSetEnabled = setAnalyticsCollectionEnabled as jest.Mock;

/**
 * Drives the REAL runtime source. GA4 reads `Constants.expoConfig.extra.buildEnv`
 * (baked in by app.config at build time), NOT `process.env.APP_ENV` — Metro does
 * not inline the latter into the device bundle, so a test on `process.env` would
 * validate a source that is always undefined on-device. Set the value the app
 * actually reads.
 */
function setBuildEnv(buildEnv: string | undefined): void {
  (Constants.expoConfig!.extra as Record<string, unknown>).buildEnv = buildEnv;
}

describe('ga4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables collection in a production build', () => {
    setBuildEnv('production');
    initGa4();

    expect(isGa4Enabled()).toBe(true);
    expect(mockSetEnabled).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('enables collection in a preview build', () => {
    setBuildEnv('preview');
    initGa4();
    expect(isGa4Enabled()).toBe(true);
  });

  it('disables collection in development — a complete no-op', async () => {
    setBuildEnv('development');
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    expect(mockSetEnabled).toHaveBeenCalledWith(expect.anything(), false);

    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('disables collection when buildEnv is absent — the real device default was undefined', async () => {
    setBuildEnv(undefined);
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('logs a name-only event when enabled', async () => {
    setBuildEnv('production');
    initGa4();

    await logGa4Event('purchase');
    expect(mockLogEvent).toHaveBeenCalledWith(expect.anything(), 'purchase');
  });
});
