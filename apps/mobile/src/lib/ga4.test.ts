import { logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';

import { initGa4, isGa4Enabled, logGa4Event } from './ga4';

const mockLogEvent = logEvent as jest.Mock;
const mockSetEnabled = setAnalyticsCollectionEnabled as jest.Mock;

describe('ga4', () => {
  const ORIGINAL_ENV = process.env.APP_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.APP_ENV = ORIGINAL_ENV;
  });

  it('enables collection in production', () => {
    process.env.APP_ENV = 'production';
    initGa4();

    expect(isGa4Enabled()).toBe(true);
    expect(mockSetEnabled).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('enables collection in preview', () => {
    process.env.APP_ENV = 'preview';
    initGa4();
    expect(isGa4Enabled()).toBe(true);
  });

  it('disables collection in development — a complete no-op', async () => {
    process.env.APP_ENV = 'development';
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    expect(mockSetEnabled).toHaveBeenCalledWith(expect.anything(), false);

    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('logs a name-only event when enabled', async () => {
    process.env.APP_ENV = 'production';
    initGa4();

    await logGa4Event('purchase');
    expect(mockLogEvent).toHaveBeenCalledWith(expect.anything(), 'purchase');
  });
});
