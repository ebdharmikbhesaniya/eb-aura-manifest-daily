import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { paywallCopy } from '@/copy/paywall';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LetterMotionProvider } from '@/theme/motion';

import { DISMISS_DELAY_MS, PaywallScreen } from './PaywallScreen';
import type { OfferedPlan } from './purchases';

jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));

const { analytics } = jest.requireMock('@/lib/analytics') as { analytics: { capture: jest.Mock } };

/**
 * The post-Letter paywall — the trial-timeline redesign (2026-08-10), tested
 * against product 15's anti-resentment checklist.
 *
 * Half of these assert ABSENCE. A dark pattern is not a bug that throws; it is a
 * countdown someone added because it converted. Pinning "there is no timer, no
 * fake discount, no second offer" is the only way that stays true through the
 * next round of conversion tuning.
 */
describe('PaywallScreen', () => {
  const plan = (
    id: 'annual' | 'monthly' | 'weekly',
    overrides: Partial<OfferedPlan> = {},
  ): OfferedPlan =>
    ({
      id,
      price: id === 'annual' ? '$39.99' : id === 'monthly' ? '$14.99' : '$6.99',
      monthlyEquivalent: id === 'annual' ? '$3.33' : id === 'weekly' ? '$30.29' : null,
      hasTrial: false,
      trialDays: null,
      pkg: { product: { identifier: `aura_premium_${id}` } },
      ...overrides,
    }) as OfferedPlan;

  // The real offer: the annual hero carries a 7-day trial.
  const trialPlans = [plan('annual', { hasTrial: true, trialDays: 7 })];
  // The store has no intro offer configured yet — the honest fallback.
  const noTrialPlans = [plan('annual')];

  const renderPaywall = (props: Partial<React.ComponentProps<typeof PaywallScreen>> = {}) =>
    render(
      <ThemeProvider>
        <LetterMotionProvider>
          <PaywallScreen
            plans={trialPlans}
            onPurchase={jest.fn()}
            onDismiss={jest.fn()}
            onRestore={jest.fn()}
            {...props}
          />
        </LetterMotionProvider>
      </ThemeProvider>,
    );

  // Hard-gate mode: no `onDismiss` at all, so the ✕ can never render.
  const renderHardPaywall = (props: Partial<React.ComponentProps<typeof PaywallScreen>> = {}) =>
    render(
      <ThemeProvider>
        <LetterMotionProvider>
          <PaywallScreen
            plans={trialPlans}
            onPurchase={jest.fn()}
            onRestore={jest.fn()}
            {...props}
          />
        </LetterMotionProvider>
      </ThemeProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // A test that leaves fake timers on would stop the next test's render from
  // ever flushing — restore real timers no matter how a test exits.
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the trial timeline', () => {
    it('leads with the trial headline and "nothing charged today"', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.trial.headline)).toBeTruthy();
      expect(screen.getByText(paywallCopy.trial.subhead)).toBeTruthy();
    });

    it('shows the three beats with the real trial length (7 → today / in 5 / in 7)', async () => {
      await renderPaywall();

      expect(screen.getByTestId('paywall-timeline')).toBeTruthy();
      expect(screen.getByText(paywallCopy.trial.todayTitle)).toBeTruthy();
      expect(screen.getByText('In 5 days')).toBeTruthy();
      expect(screen.getByText('In 7 days')).toBeTruthy();
    });

    it('names the free-trial badge', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.trial.badge)).toBeTruthy();
    });
  });

  describe('honest numbers (checklist #2)', () => {
    it('prints the annual price and its monthly equivalent', async () => {
      await renderPaywall();

      expect(screen.getByText('$39.99/year')).toBeTruthy();
      expect(screen.getByText(/about \$3\.33 a month, billed once/)).toBeTruthy();
    });

    it('discloses the renewal terms with the real trial length and price', async () => {
      await renderPaywall();

      expect(
        screen.getByText(/Free for 7 days, then \$39\.99\/year\. Renews automatically\./),
      ).toBeTruthy();
    });

    it('speaks the full one-line honest price to assistive tech', async () => {
      await renderPaywall();

      expect(screen.getByLabelText(/\$39\.99\/year · about \$3\.33\/month/)).toBeTruthy();
    });
  });

  describe('the CTA', () => {
    it('reads as the free trial and buys the hero plan', async () => {
      const onPurchase = jest.fn();
      await renderPaywall({ onPurchase });

      expect(screen.getByText(paywallCopy.plans.ctaTrial)).toBeTruthy();
      fireEvent.press(screen.getByTestId('paywall-continue'));

      expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'annual' }));
    });
  });

  describe('hard-gate mode (2026-08-10)', () => {
    it('shows the letter-is-hers line in soft mode (a real dismissal exists)', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.dismissed)).toBeTruthy();
    });

    it('hides the letter-is-hers line in hard mode (there is no free exit)', async () => {
      await renderHardPaywall();

      expect(screen.queryByText(paywallCopy.dismissed)).toBeNull();
    });
  });

  describe('no-trial fallback', () => {
    it('shows no timeline and a plain Continue offer when the store has no trial', async () => {
      await renderPaywall({ plans: noTrialPlans });

      expect(screen.queryByTestId('paywall-timeline')).toBeNull();
      expect(screen.getByText(paywallCopy.headline)).toBeTruthy();
      expect(screen.getByText(paywallCopy.plans.cta)).toBeTruthy();
      expect(screen.getByText(paywallCopy.plans.renewalNote)).toBeTruthy();
    });
  });

  describe('no dark patterns (product 01 §10, release-blocking)', () => {
    it('shows no countdown or expiring offer', async () => {
      await renderPaywall();

      expect(screen.queryByText(/\d+:\d\d/)).toBeNull();
      expect(screen.queryByText(/expires|ends in|hurry|only today|limited/i)).toBeNull();
    });

    it('shows no struck-through or discounted price', async () => {
      await renderPaywall();

      expect(screen.queryByText(/was \$|save \d+%|\d+% off/i)).toBeNull();
    });

    it('claims no social proof we have not earned', async () => {
      await renderPaywall();

      expect(screen.queryByText(/join \d|\d+[km]? (people|users|members)/i)).toBeNull();
    });

    it('never implies the letter is at stake', async () => {
      await renderPaywall();

      expect(screen.queryByText(/lose|delete|forfeit|expire/i)).toBeNull();
    });
  });

  describe('footer', () => {
    it('offers restore, so nobody pays twice for the same subscription', async () => {
      const onRestore = jest.fn();
      await renderPaywall({ onRestore });

      fireEvent.press(screen.getByTestId('paywall-restore'));

      expect(onRestore).toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('reports the view with its surface', async () => {
      await renderPaywall();

      expect(analytics.capture).toHaveBeenCalledWith('paywall_viewed', {
        surface: 'post_letter',
      });
    });
  });

  // Timer-driven cases run LAST: switching to fake timers mid-file leaves the
  // next real-timer render unable to flush, so everything that needs a clean
  // real-timer render must have already run.
  describe('the delayed dismiss control', () => {
    it('reveals the ✕ after the delay in soft mode', async () => {
      jest.useFakeTimers();
      await renderPaywall();

      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });

      expect(screen.getByTestId('paywall-dismiss')).toBeTruthy();
      jest.useRealTimers();
    });

    it('never reveals a ✕ in hard mode, even after the delay', async () => {
      jest.useFakeTimers();
      await renderHardPaywall();

      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });

      expect(screen.queryByTestId('paywall-dismiss')).toBeNull();
      jest.useRealTimers();
    });
  });
});
