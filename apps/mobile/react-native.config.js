// Autolinking overrides for react-native / expo native modules.
//
// Google Sign-In is Android-only for this app (Apple Sign-In covers iOS —
// app.config.ts iOS block sets `usesAppleSignIn: true`). Autolinking the pod
// pulls in AppCheckCore → GoogleUtilities + RecaptchaInterop, which fails
// pod install under the default static-library linkage with:
//   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
//    `RecaptchaInterop`, which do not define modules."
//
// The JS module is loaded LAZILY in src/features/auth/google.ts (try/catch on
// require) and `googleAuthAvailable()` hides the button when the native side
// isn't present — so skipping ios autolinking is safe: iOS just falls through
// to Apple / Email like the app.config.ts comment describes.
module.exports = {
  dependencies: {},
};
