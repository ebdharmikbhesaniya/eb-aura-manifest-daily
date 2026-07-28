# Continue with Apple — Setup Guide

How to enable **Sign in with Apple** for Aura: Manifest Daily. The app **code is
already done** — this guide covers the external configuration (Apple + Supabase)
and the iOS build.

## What's already in place (no code changes needed)

- `expo-apple-authentication` dependency.
- `ios.usesAppleSignIn: true` in `app.config.ts`.
- The native flow: `AppleAuthentication.signInAsync()` →
  `authenticateWithProvider('apple', idToken)` → `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.
- The gate button, with the Apple glyph, in `app/(auth)/sign-in.tsx` and the
  Settings sign-in sheet.

## Two realities to know first

1. **Apple Sign In is iOS-only.** The button is deliberately hidden on Android
   (`appleAuthAvailable()` → `AppleAuthentication.isAvailableAsync()` returns
   `false` there). It appears and works only on a real iPhone or iOS simulator.
   Not seeing it on Android is correct, not a bug.
2. **You need a paid Apple Developer account** ($99/year) — Sign in with Apple
   cannot be configured without one. And because this repo is developed on Linux
   (no Xcode), the iOS build path is **EAS Build** (Expo's cloud) or a Mac.

## Your identifiers (copy-paste)

| Thing                 | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| Prod bundle ID        | `com.aura.manifestdaily`                                    |
| Dev bundle ID         | `com.aura.manifestdaily.dev`                                |
| Supabase project ref  | `iaxfkgbfaguevlbuunve`                                      |
| Supabase callback URL | `https://iaxfkgbfaguevlbuunve.supabase.co/auth/v1/callback` |

---

## Step 1 — Apple Developer: App ID + capability

[developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers
& Profiles → Identifiers**.

1. Register an **App ID** for `com.aura.manifestdaily` (and a second one for
   `com.aura.manifestdaily.dev` if you want Apple sign-in in the dev build too).
2. On each App ID, tick the **Sign In with Apple** capability → **Save**.

## Step 2 — Services ID (server-side "client ID")

Identifiers → **+** → **Services IDs**.

1. Description: `Aura Sign In`; Identifier: e.g. `com.aura.manifestdaily.signin`.
2. Enable **Sign In with Apple** → **Configure**:
   - **Primary App ID**: `com.aura.manifestdaily`
   - **Domains**: `iaxfkgbfaguevlbuunve.supabase.co`
   - **Return URLs**: `https://iaxfkgbfaguevlbuunve.supabase.co/auth/v1/callback`

## Step 3 — Sign In with Apple key (.p8)

Keys → **+** → name it → tick **Sign In with Apple** → **Configure** (pick the
primary App ID) → **Register** → **Download the `.p8`**.

- You can download it **only once** — store it safely.
- Note the **Key ID** and your **Team ID** (Team ID is top-right of the portal).
- Keep the `.p8` out of git — `*.p8` is already in `.gitignore`.

## Step 4 — Supabase: enable the Apple provider

Supabase → **Authentication → Providers → Apple** → enable, then fill:

- **Client IDs** (comma-separated) — **the critical field for this app's native
  flow.** Add your **bundle IDs**:
  `com.aura.manifestdaily,com.aura.manifestdaily.dev`
  A native Apple id-token's audience is the **bundle ID**, so Supabase must list
  it to accept the token. (Add the Services ID here too if you later add a
  web/OAuth flow.)
- **Secret Key (for OAuth)** — generated from the **Services ID + Team ID +
  Key ID + the `.p8`**. Needed for token refresh and any web/OAuth flow. The
  Supabase Apple docs page has a generator, or supply the components.

## Step 5 — Build for iOS (EAS, since you're on Linux)

```bash
npm i -g eas-cli
eas login
eas build:configure
# development client (recommended while testing):
eas build -p ios --profile development
# or a TestFlight-installable build:
eas build -p ios --profile preview
```

EAS will prompt to manage Apple credentials — log in with your Developer
account and let it create the signing assets. Install the result on an iPhone
(dev build directly, or via TestFlight for `preview`/`production`).

> A Mac alternative: `npx expo run:ios` builds and runs locally without EAS.

## Step 6 — Test

Open the app on the iPhone → the sign-in gate now shows **"Continue with
Apple"** (with the Apple glyph) → tap → the native Apple sheet appears → on
success the id-token goes to `signInWithIdToken` and you're signed in via
Supabase.

---

## Decision tree

- **No Apple Developer account** → that's the blocker; enroll first, nothing else
  can proceed.
- **Account, on Linux** → use **EAS Build** (Step 5). `eas.json` can be added and
  the build walked through.
- **Have a Mac** → you can also `npx expo run:ios` locally instead of EAS.

## Troubleshooting

| Symptom                                                | Likely cause                                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| No Apple button on the device                          | You're on Android (expected — iOS only), or on an iOS build where `usesAppleSignIn` didn't apply — rebuild after prebuild. |
| Supabase rejects the token (audience/`invalid_client`) | The app's **bundle ID isn't in Supabase → Apple → Client IDs**. Add `com.aura.manifestdaily` / `.dev`.                     |
| Works in dev, fails in prod (or vice-versa)            | Only one bundle ID is registered/listed. Register both App IDs and list both bundle IDs in Supabase.                       |
| `.p8` / secret errors                                  | Wrong Team ID or Key ID, or the Services ID return URL doesn't match the Supabase callback exactly.                        |

## Related

- `docs/technical/03-AUTH-ARCHITECTURE.md` — the auth model (native id-token
  sign-in, RLS boundary).
- Google's equivalent is already live on Android; Apple covers iOS. Neither
  provider exists on the other platform, which is why each button is gated on
  availability.
