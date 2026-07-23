import type * as PurchasesModuleShape from './purchases';

/**
 * The store key is selected per platform (12 §2).
 *
 * RevenueCat issues one key PER STORE, and the iOS key is REJECTED by the
 * Android SDK. Getting this wrong fails silently in the worst way: RC refuses
 * the key, every entitlement read resolves to free, and nothing crashes — so
 * Android users would simply never receive what they paid for, with no error
 * anywhere to notice. That silence is why this is pinned by a test rather than
 * left to the type checker.
 */

// Each case re-requires the module: `configurePurchases` holds a module-level
// `configured` flag, so a shared instance would make test order significant.
// `require` rather than `import()` — this suite runs as CJS.
async function configureOn(platform: 'ios' | 'android', env: Record<string, string>) {
  let configure!: jest.Mock;
  let run!: Promise<void>;

  jest.isolateModules(() => {
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      __esModule: true,
      default: { OS: platform, select: (spec: Record<string, unknown>) => spec[platform] },
    }));
    jest.doMock('@/lib/env', () => ({ env }));

    const Purchases = require('react-native-purchases').default;
    configure = Purchases.configure as jest.Mock;
    configure.mockClear();

    run = require('./purchases').configurePurchases('user-1') as Promise<void>;
  });

  await run;
  return configure;
}

const IOS_KEY = 'appl_test_key';
const ANDROID_KEY = 'goog_test_key';
const BOTH = {
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: IOS_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: ANDROID_KEY,
};

describe('configurePurchases', () => {
  it('uses the App Store key on iOS', async () => {
    const configure = await configureOn('ios', BOTH);

    expect(configure).toHaveBeenCalledWith({ apiKey: IOS_KEY, appUserID: 'user-1' });
  });

  it('uses the Play Store key on Android', async () => {
    const configure = await configureOn('android', BOTH);

    expect(configure).toHaveBeenCalledWith({ apiKey: ANDROID_KEY, appUserID: 'user-1' });
  });

  it('never hands the iOS key to the Android SDK', async () => {
    // The specific regression this file exists to prevent: before the platform
    // split, `configurePurchases` read the iOS key unconditionally.
    const configure = await configureOn('android', {
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: IOS_KEY,
    });

    expect(configure).not.toHaveBeenCalled();
  });

  it('degrades to free rather than throwing when the platform has no key', async () => {
    // A monetization outage must look like "free tier", never a broken launch
    // — the documented behaviour for a dev build with no RC project.
    const configure = await configureOn('ios', {});

    expect(configure).not.toHaveBeenCalled();
  });
});

type PurchasesModule = typeof PurchasesModuleShape;

/**
 * The fallback offer (12 §1).
 *
 * A build with no RevenueCat project used to render the paywall with nothing on
 * it — no plans, so no CTA, so no offer to read. These stand-ins exist so the
 * cover can still state the offer, and the thing that MUST hold is that they
 * are never charged against: they carry no store package.
 */
describe('fallback plans', () => {
  const load = () => {
    let mod!: PurchasesModule;
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({ env: {} }));
      mod = require('./purchases') as PurchasesModule;
    });
    return mod;
  };

  it('states the offer even with no store behind it', () => {
    const plans = load().fallbackPlans();

    expect(plans).toHaveLength(2);
    expect(plans.every((p) => p.price.length > 0)).toBe(true);
  });

  it('leads with annual — it is the hero and is pre-selected', () => {
    expect(load().fallbackPlans()[0]?.id).toBe('annual');
  });

  it('marks every one unpurchasable, with no package to charge', () => {
    const plans = load().fallbackPlans();

    expect(plans.every((p) => p.purchasable === false)).toBe(true);
    expect(plans.every((p) => p.pkg === null)).toBe(true);
  });

  it('refuses to buy one rather than reporting a failure', async () => {
    const mod = load();
    const [annual] = mod.fallbackPlans();

    await expect(mod.purchasePlan(annual!)).resolves.toEqual({ status: 'unavailable' });
  });

  it('falls back rather than returning nothing when RevenueCat is unconfigured', async () => {
    await expect(load().loadPlans()).resolves.toHaveLength(2);
  });
});
