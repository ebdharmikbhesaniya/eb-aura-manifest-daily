# Continue with Apple — Setup Guide

How to enable **Sign in with Apple** for Aura: Manifest Daily. The app **code is
done and the native project is already prebuilt with the capability** — what
remains is external configuration in two dashboards (Apple + Supabase).

Roughly 30 minutes of dashboard work. No code changes.

## What's already in place (verified in the repo)

- `expo-apple-authentication` dependency.
- `ios.usesAppleSignIn: true` — `apps/mobile/app.config.ts`.
- **The native entitlement is generated**: `apps/mobile/ios/Aura/Aura.entitlements`
  contains `com.apple.developer.applesignin`. Prebuild has run; the capability is
  in the Xcode project. No `expo prebuild` re-run is needed.
- The native flow: `AppleAuthentication.signInAsync()` →
  `authenticateWithProvider('apple', idToken)` →
  `supabase.auth.signInWithIdToken({ provider: 'apple', token })`
  (`src/features/auth/session.ts`).
- `claimWithApple()` via `linkIdentity` for attaching Apple to an existing
  account without changing the `user_id` (`src/features/paywall/claim.ts`).
- The gate button with the Apple glyph in `app/(auth)/sign-in.tsx` and the
  Settings sign-in sheet.

## Two realities to know first

1. **Apple Sign In is iOS-only.** The button is deliberately hidden on Android
   (`appleAuthAvailable()` → `AppleAuthentication.isAvailableAsync()` returns
   `false` there). Not seeing it on Android is correct, not a bug.
2. **You need a paid Apple Developer account** ($99/year) — Sign in with Apple
   cannot be configured without one.

## Your identifiers (copy-paste)

| Thing                 | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| Bundle ID             | `com.aura.manifestdaily`                                    |
| Apple Team ID         | `Q8Z48Q7K2B`                                                |
| Supabase project ref  | `iaxfkgbfaguevlbuunve`                                      |
| Supabase callback URL | `https://iaxfkgbfaguevlbuunve.supabase.co/auth/v1/callback` |
| Suggested Services ID | `com.aura.manifestdaily.signin`                             |

> **One bundle ID, every environment.** Local dev, staging, preview and
> production all build `com.aura.manifestdaily` (founder decision 2026-07-29 —
> see the `ONE IDENTITY, EVERY ENVIRONMENT` note in `app.config.ts`). The
> `.dev`/`.staging` suffixes were **removed**, not defaulted to empty. Register
> and list exactly one bundle ID; a second `.dev` App ID is wasted work.

---

## Shortest path

**Steps 1 + 4 alone make login work.** Steps 2 and 3 are needed only for a web
OAuth flow and for Apple's token-revocation-on-account-delete expectation. Do
them anyway if the Supabase dashboard requires a secret before it will save.

---

## Step 0 — Identify the `.p8` already on disk

There is a key at `apps/mobile/AuraAuthKey_M6968FYKG6.p8` (key ID looks like
`M6968FYKG6`). Nothing in the repo records what it is for, and Sign in with
Apple keys and APNs push keys are both `.p8`.

[developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers
& Profiles → Keys** → open key `M6968FYKG6` and read its enabled services:

- **Sign in with Apple** → Step 3 is already done, skip it.
- **APNs** only → that is the push key. You still need a separate Sign in with
  Apple key; do Step 3.

Do this first — it decides whether Step 3 is real work.

## Step 1 — App ID capability (required)

**Identifiers** → find or register `com.aura.manifestdaily`.

1. Tick **Sign In with Apple**.
2. Leave it as **Enable as a primary App ID**.
3. **Save**.

The entitlement in the native project only _requests_ the capability; the App ID
must grant it or signing fails.

## Step 2 — Services ID (skip on the shortest path)

Identifiers → **+** → **Services IDs**.

1. Description: `Aura Sign In`; Identifier: `com.aura.manifestdaily.signin`.
2. Enable **Sign In with Apple** → **Configure**:
   - **Primary App ID**: `com.aura.manifestdaily`
   - **Domains and Subdomains**: `iaxfkgbfaguevlbuunve.supabase.co`
   - **Return URLs**: `https://iaxfkgbfaguevlbuunve.supabase.co/auth/v1/callback`

The Return URL must match exactly — no trailing slash. A mismatch here is the
second-most-common failure after Step 4.

## Step 3 — Sign in with Apple key (only if Step 0 says you need one)

Keys → **+** → name it `Aura Sign In Key` → tick **Sign In with Apple** →
**Configure** (primary App ID `com.aura.manifestdaily`) → **Register** →
**Download the `.p8`**.

- Downloadable **once** — store it safely.
- Note the **Key ID**. The Team ID is `Q8Z48Q7K2B`.
- Keep it out of git — `*.p8` is already in `.gitignore`.

## Step 4 — Supabase provider (the one that actually matters)

Supabase Dashboard → project `iaxfkgbfaguevlbuunve` → **Authentication → Sign In
/ Providers → Apple** → **Enable**.

**Client IDs** — enter exactly:

```
com.aura.manifestdaily
```

**This is the BUNDLE ID, not the Services ID.** The app uses the native flow, and
a native Apple id-token's `aud` claim is the bundle id — so Supabase must list it
to accept the token. Missing it is the #1 cause of failure, and it surfaces as
`invalid_client`. Add the Services ID here as well only if you later build a web
flow.

**Secret Key (for OAuth)** — **leave this EMPTY.**

The field is used by the OAuth/web redirect flow, which this app never enters,
and by Apple's token-revocation endpoint. The native flow is gated only by the
toggle above and the Client IDs list. The dashboard's red _"Secret key should be
a JWT"_ only fires on non-empty input that is not a JWT — an empty field saves
fine.

If you later add a web flow (or need revocation for App Store review), generate
the JWT with the committed script rather than by hand — Apple caps its lifetime
at 6 months, so this recurs twice a year:

```bash
node scripts/apple-client-secret.mjs \
  --services-id com.aura.manifestdaily.signin \
  --team-id     Q8Z48Q7K2B \
  --key-id      M6968FYKG6 \
  --p8          apps/mobile/AuraAuthKey_M6968FYKG6.p8
```

Two things the script cannot check, both of which Apple rejects at runtime rather
than at signing time: `--services-id` must be a **Services ID** (Step 2), never
the bundle id — it becomes the `sub` claim; and `--p8` must be a **Sign in with
Apple** key, not the APNs push key, which is also an EC P-256 `.p8` and signs
just as happily (Step 0).

**Save.**

> `supabase/config.toml` has `[auth.external.apple] enabled = false`. Ignore it —
> that governs only the local Docker stack. `apps/mobile/.env` points at the
> hosted project (`EXPO_PUBLIC_SUPABASE_URL=https://iaxfkgbfaguevlbuunve.supabase.co`),
> so the dashboard is what is live, even in local development.

## Step 5 — Build and test

The repo has a full `ios/` project with Pods installed, so build locally — a much
faster loop than EAS:

```bash
cd apps/mobile
pnpm exec expo run:ios --device      # select a real iPhone
```

Use a **real device** signed into an Apple ID. Then: launch → sign-in gate →
**Continue with Apple** → the native sheet appears → on success the id-token goes
to `signInWithIdToken` and you are signed in.

EAS remains the path for TestFlight builds:

```bash
eas build -p ios --profile preview
```

---

## Troubleshooting

Provider sign-in failures are reported by `reportAuthFailure()` in
`src/features/auth/session.ts`: the Supabase error is `console.warn`ed in `__DEV__`
(read it in the Metro log) and captured to PostHog Error Tracking in every build, tagged
`area: auth`. The UI still shows only in-voice copy — never an error code
(product 14) — so the log is where the cause lives.

| Symptom                                 | Likely cause                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `invalid_client` / audience mismatch    | `com.aura.manifestdaily` missing from Supabase → Apple → **Client IDs** (Step 4)                                |
| "Provider is not enabled"               | The Apple toggle is off in Supabase (Step 4)                                                                    |
| Signing/entitlement error at build time | **Sign In with Apple** not ticked on the App ID (Step 1)                                                        |
| No Apple button on the device           | You are on Android (expected — iOS only)                                                                        |
| `.p8` / secret errors                   | Wrong Team ID or Key ID, or the Services ID Return URL does not match the Supabase callback exactly             |
| Sheet opens, then nothing, no error     | A cancel is reported as a thrown `ERR_REQUEST_CANCELED` and is silent by design — a real cancel looks like this |

## Related

- `docs/technical/03-AUTH-ARCHITECTURE.md` — the auth model (native id-token
  sign-in, RLS boundary).
- `docs/setup/google-signin-production-setup.md` — Google's equivalent. Neither
  provider exists on the other platform, which is why each button is gated on
  availability.
