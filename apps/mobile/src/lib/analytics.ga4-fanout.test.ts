// PostHog is irrelevant to this test — stub it so no real client is created.
jest.mock('posthog-react-native', () => {
  return jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    flush: jest.fn(),
  }));
});

jest.mock('./ga4', () => ({
  logGa4Event: jest.fn(() => Promise.resolve()),
  initGa4: jest.fn(),
  isGa4Enabled: jest.fn(() => true),
}));

import { logGa4Event } from './ga4';
import { analytics } from './analytics';

const mockLog = logGa4Event as jest.Mock;

describe('analytics → GA4 fan-out', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps purchase_completed to the GA4 "purchase" event', () => {
    analytics.capture('purchase_completed', { sku: 'aura_premium_annual' });
    expect(mockLog).toHaveBeenCalledWith('purchase');
  });

  it('forwards onboarding_completed under its own name', () => {
    analytics.capture('onboarding_completed', { duration_s: 120, questions_answered: 6 });
    expect(mockLog).toHaveBeenCalledWith('onboarding_completed');
  });

  it('passes the NAME only — never the catalog payload (spec §6)', () => {
    analytics.capture('purchase_completed', { sku: 'aura_premium_annual' });
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog.mock.calls[0]).toEqual(['purchase']);
  });

  it('does NOT forward non-funnel events (e.g. app_open)', () => {
    analytics.capture('app_open', { source: 'cold' });
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('does NOT forward app_first_open — GA4 logs first_open itself', () => {
    analytics.capture('app_first_open');
    expect(mockLog).not.toHaveBeenCalled();
  });
});
