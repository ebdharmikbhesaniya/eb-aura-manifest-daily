// Tells React this is a test environment so state updates are wrapped in act().
// Without it React warns on every render and async updates can escape assertions.
global.IS_REACT_ACT_ENVIRONMENT = true;

// Native modules have no JS implementation under jest — stub the ones the
// skeleton touches. Real behaviour is covered by Maestro flows on device (15).

// Reanimated's official jest mock: animations resolve instantly, worklets run
// on the JS thread. Without it, importing the library throws in a test env.
// The official mock predates the frame-callback and scroll APIs the Letter's
// karaoke renderer uses (10 §5), so those are filled in here. They are no-ops:
// under jest there are no frames, and position is driven directly by the tests.
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useFrameCallback: mock.useFrameCallback ?? jest.fn(() => ({ setActive: jest.fn() })),
    useAnimatedRef: mock.useAnimatedRef ?? jest.fn(() => ({ current: null })),
    useAnimatedReaction: mock.useAnimatedReaction ?? jest.fn(),
    scrollTo: mock.scrollTo ?? jest.fn(),
  };
});

// The library's own jest mock supplies zeroed insets and frame metrics without
// the native provider. Global rather than per-file: `useTabBarClearance` reads
// insets, and every tab screen calls it.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// keyboard-controller is native (it reads the IME frame to survive Android
// edge-to-edge). Its official jest mock renders KeyboardProvider and
// KeyboardAvoidingView as plain pass-throughs, so every screen that switched to
// them mounts without the native module.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);

// Its native view manager doesn't exist under jest; a plain View preserves
// children and layout, which is all the tests reason about.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// expo-linking builds the app's deep-link URLs. The stub mirrors the real
// scheme-based output so `authRedirectUrl()` and the email-flow callers can be
// asserted without the native module.
jest.mock('expo-linking', () => ({
  createURL: (path) => `aura://${String(path).replace(/^\/+/, '')}`,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// MMKV v4 is a Nitro module with no JS fallback; `createMMKV` is the factory.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: jest.fn(() => ({
      getString: (k) => store.get(k),
      set: (k, v) => store.set(k, String(v)),
      remove: (k) => store.delete(k),
      clearAll: () => store.clear(),
    })),
  };
});

// expo-audio has no JS implementation under jest. The stub is a controllable
// player: tests drive playback by mutating the status the hook reads, which is
// how the Letter's karaoke and haptic beats are exercised without real audio.
jest.mock('expo-audio', () => {
  const React = require('react');
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
  // `error` mirrors the real AudioStatus field (null unless the source failed to
  // load). The Letter reads it to tell "not started yet" from "will never play".
  // `playbackState`/`isLoaded`/`error` mirror the real AudioStatus. They are how
  // the Letter tells "not started yet" from "will never play" — and on Android
  // only the first two ever move, which is why all three are modelled here.
  const IDLE = {
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
    error: null,
    isLoaded: false,
    playbackState: 'idle',
  };

  let status = { ...IDLE };
  const listeners = new Set();

  return {
    __player: player,
    /** Drives playback from a test: `act(() => __setStatus({ currentTime: 4.4 }))`. */
    __setStatus: (next) => {
      status = { ...status, ...next };
      listeners.forEach((notify) => notify(status));
    },
    __resetStatus: () => {
      status = { ...IDLE };
      listeners.forEach((notify) => notify(status));
    },
    useAudioPlayer: jest.fn(() => player),
    // Subscribes like the real hook does, so a status change actually re-renders
    // the component under test. A plain object would leave the Letter frozen at
    // zero and every timing assertion would pass vacuously.
    useAudioPlayerStatus: jest.fn(() => {
      const [current, setCurrent] = React.useState(status);
      React.useEffect(() => {
        listeners.add(setCurrent);
        setCurrent(status);
        return () => listeners.delete(setCurrent);
      }, []);
      return current;
    }),
    setAudioModeAsync: jest.fn(async () => undefined),
  };
});

// The new File/Directory API is native-backed; these stubs keep the audio cache
// testable (it is pure index bookkeeping around them).
jest.mock('expo-file-system', () => {
  const files = new Set();
  return {
    __files: files,
    Paths: { cache: { uri: 'file:///cache/' } },
    Directory: jest.fn(function (...parts) {
      this.uri = `file:///cache/${parts.slice(1).join('/')}`;
      this.exists = true;
      this.create = jest.fn();
      this.delete = jest.fn(() => files.clear());
    }),
    File: Object.assign(
      jest.fn(function (...parts) {
        const tail = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
        this.uri = tail.startsWith('file://') ? tail : `file:///cache/${tail}`;
        Object.defineProperty(this, 'exists', { get: () => files.has(this.uri) });
        this.delete = jest.fn(() => files.delete(this.uri));
      }),
      {
        downloadFileAsync: jest.fn(async (_url, destination) => {
          files.add(destination.uri);
          return destination;
        }),
      },
    ),
  };
});

// RevenueCat's SDK is native-only. The stub starts everyone on the FREE tier,
// which is the right default for tests: a gating bug that leaks premium should
// fail a test, and a stub that returned premium would hide exactly that.
jest.mock('react-native-purchases', () => {
  const listeners = new Set();
  let customerInfo = { entitlements: { active: {} } };

  return {
    __esModule: true,
    __setCustomerInfo: (next) => {
      customerInfo = next;
      listeners.forEach((notify) => notify(next));
    },
    __resetCustomerInfo: () => {
      customerInfo = { entitlements: { active: {} } };
    },
    default: {
      configure: jest.fn(),
      logIn: jest.fn(async () => ({ customerInfo })),
      getCustomerInfo: jest.fn(async () => customerInfo),
      getOfferings: jest.fn(async () => ({ current: null })),
      purchasePackage: jest.fn(async () => ({ customerInfo })),
      restorePurchases: jest.fn(async () => customerInfo),
      showManageSubscriptions: jest.fn(async () => undefined),
      addCustomerInfoUpdateListener: jest.fn((l) => listeners.add(l)),
      removeCustomerInfoUpdateListener: jest.fn((l) => listeners.delete(l)),
    },
  };
});

// SF Symbols are a native iOS view, so `SymbolView` cannot render under jest.
// The stub renders `fallback`, which is exactly what the real component does
// off-iOS — so these tests exercise the Feather path an Android user sees, and
// a missing fallback shows up as an empty tab bar in a test rather than on a
// device.
jest.mock('expo-symbols', () => ({
  __esModule: true,
  SymbolView: ({ fallback }) => fallback ?? null,
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(async () => ({ identityToken: 'token' })),
  AppleAuthenticationScope: { EMAIL: 0, FULL_NAME: 1 },
}));

// Native canvas capture; the share renderer's PRIVACY rule is tested against
// `toShareContent` rather than a real bitmap.
jest.mock('react-native-view-shot', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    captureRef: jest.fn(async () => 'file:///tmp/share.png'),
  };
});

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));

jest.mock('expo-device', () => ({ isDevice: true, modelId: 'iPhone14,2' }));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Metro inlines these at build time; jest needs them set explicitly.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3000';

// Firebase Analytics has no JS implementation under jest. v26 is the modular
// API — named exports, no default — so mock getAnalytics/logEvent/
// setAnalyticsCollectionEnabled as jest.fns tests can assert on.
jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

// expo-tracking-transparency has no native impl under jest.
jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  requestTrackingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));
