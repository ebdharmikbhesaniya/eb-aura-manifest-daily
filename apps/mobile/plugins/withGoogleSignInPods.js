// Makes the GoogleSignIn pod integrable on iOS, which is what lets Google
// sign-in exist on iOS at all (03 §2.2).
//
// `@react-native-google-signin/google-signin` depends on GoogleSignIn, which
// depends on AppCheckCore — a SWIFT pod. AppCheckCore in turn depends on
// GoogleUtilities and RecaptchaInterop, which are Objective-C pods that ship no
// module map. CocoaPods refuses to integrate a Swift pod against non-modular
// static libraries and fails `pod install` outright:
//
//   The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
//   `RecaptchaInterop`, which do not define modules.
//
// This was previously "solved" by disabling iOS autolinking for the whole module
// in react-native.config.js. That did fix the build, at the cost of the feature:
// the native module was absent from the binary, so `googleAuthAvailable()`
// returned false and iOS silently never showed a Google button.
//
// The fix here is the narrower of the two CocoaPods suggests: opt ONLY those two
// pods into generating module maps. `use_modular_headers!` globally would also
// work, but it changes header visibility for every pod in the graph — Skia,
// MMKV, RevenueCat, Sentry, Reanimated — to solve a problem in two of them, and
// that blast radius is not worth it.
//
// Ordering note: this is a withDangerousMod on the Podfile, a different mod than
// withSilencedBuildPhases' withXcodeProject, so registration order relative to
// that plugin does not matter.

const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod } = require('expo/config-plugins');

/** Anchor in Expo's generated Podfile. Pod declarations must land inside the target block. */
const ANCHOR = 'config = use_native_modules!(config_command)';

/** Idempotency marker — prebuild may run against an existing Podfile. */
const MARKER = '# >>> withGoogleSignInPods (generated)';

const BLOCK = [
  `  ${MARKER}`,
  '  # AppCheckCore (Swift, via GoogleSignIn) cannot be integrated as a static',
  '  # library unless these two define module maps. See plugins/withGoogleSignInPods.js.',
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
  '  # <<< withGoogleSignInPods',
].join('\n');

const withGoogleSignInPods = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes(MARKER)) return cfg;

      if (!podfile.includes(ANCHOR)) {
        // Fail loudly rather than silently producing a Podfile that cannot
        // install — a silent no-op here reads as "iOS Google sign-in is broken
        // again" with no clue why.
        throw new Error(
          `[withGoogleSignInPods] Could not find the anchor \`${ANCHOR}\` in ios/Podfile. ` +
            `Expo's Podfile template has changed; update ANCHOR in ` +
            `plugins/withGoogleSignInPods.js to a line inside the app target block.`,
        );
      }

      fs.writeFileSync(podfilePath, podfile.replace(ANCHOR, `${ANCHOR}\n\n${BLOCK}`), 'utf8');
      return cfg;
    },
  ]);
};

module.exports = withGoogleSignInPods;
