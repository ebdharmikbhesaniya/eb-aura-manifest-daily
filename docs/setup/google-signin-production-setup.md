# Google Sign-In — Production Setup (Android / Play Store)

Everything needed to make **"Continue with Google"** appear and work in the
production Android build of _Aura: Manifest Daily_.

## Reference values (copy-paste)

| Thing                           | Value                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Firebase project                | `aura-ca0d1` (project number `1026671088815`)                                                     |
| Production package              | `com.aura.manifestdaily`                                                                          |
| EAS upload-keystore **SHA-1**   | `6E:E9:6D:44:BC:B7:57:9A:EB:34:4E:CB:D9:E3:8A:12:03:1C:0A:44`                                     |
| EAS upload-keystore **SHA-256** | `8D:62:79:F9:F0:53:BA:F2:33:93:A8:CA:5B:31:95:ED:00:FC:4D:F1:DE:B4:D2:11:0E:A6:A3:71:9A:2F:BD:B4` |
| Web OAuth client ID             | `1026671088815-iq0qt119umtkrsn90pib0lefn1kqlasr.apps.googleusercontent.com`                       |

### Why two SHA-1s matter

Google Sign-In authorizes by **package name + app signing certificate**.

- The **EAS upload keystore** (`6E:E9…`) signs the APKs you distribute directly (the preview APK, internal testing).
- **Google Play re-signs** every store download with **Play App Signing** — a _different_ certificate with its _own_ SHA-1.

So the production package in Firebase needs **both** fingerprints, or sign-in
will fail for whichever install path is missing.

---

## Phase 1 — Firebase: register the production app

1. Go to <https://console.firebase.google.com> and open project **`aura-ca0d1`**.
2. Click the **gear icon ⚙** next to _Project Overview_ (top-left) → **Project settings**.
3. Stay on the **General** tab → scroll to **Your apps**.
4. Click **Add app** → the **Android** icon.
5. Fill in:
   - **Android package name:** `com.aura.manifestdaily` _(exactly — no `.dev`)_
   - **App nickname (optional):** `Aura Android (Production)`
   - **Debug signing certificate SHA-1:** paste `6E:E9:6D:44:BC:B7:57:9A:EB:34:4E:CB:D9:E3:8A:12:03:1C:0A:44`
6. Click **Register app**.
7. Click **Download google-services.json**. _(Skip every Gradle instruction — Expo handles that.)_
8. Save that file over `apps/mobile/google-services.json` in the repo.

### Add the SHA-256 too

Project settings → **General** → **Your apps** → select the
`com.aura.manifestdaily` app → **Add fingerprint** → paste the **SHA-256**
value from the table.

---

## Phase 2 — Google Play: add the Play App Signing SHA-1

Do this once the app exists in Play Console (needed for **store** installs, not
for the preview APK).

1. Go to <https://play.google.com/console> → open the app (create it if new).
2. Left menu → **Test and release** → **App integrity**.
3. Open the **App signing** tab.
4. Under **App signing key certificate**, copy the **SHA-1 certificate fingerprint**.
   _(The "Upload key certificate" SHA-1 on the same page should equal `6E:E9…` — that's your EAS keystore.)_
5. Back in **Firebase → Project settings → General → Your apps →
   `com.aura.manifestdaily` → Add fingerprint**, paste that Play App Signing SHA-1.
6. **Re-download google-services.json** and replace `apps/mobile/google-services.json` again, so it includes every fingerprint.

---

## Phase 3 — Google Cloud: publish the OAuth consent screen

Without this, only whitelisted "test users" can sign in and their sessions
expire after 7 days.

1. Go to <https://console.cloud.google.com> → top project picker → select **`aura-ca0d1`**.
2. Menu ☰ → **APIs & Services** → **OAuth consent screen** _(newer UI: **Google Auth Platform → Audience**)_.
3. **User type** should be **External**.
4. If **Publishing status** is _Testing_, click **Publish app** → confirm → status becomes **In production**.
5. Confirm **App information** is filled: app name, user support email, developer contact email. Logo/domain optional.
6. **Scopes:** the app only uses `email`, `profile`, `openid` (non-sensitive) — **no Google verification review is required**.

> Optional check — **APIs & Services → Credentials**: you should see the _Web
> client_ (`1026671088815-iq0qt…`, this is the one the app + Supabase use) plus
> an _Android_ client for each package/SHA-1 that Firebase auto-created.

---

## Phase 4 — Supabase: confirm the Google provider

1. <https://supabase.com/dashboard> → project → **Authentication** (left) → **Sign In / Providers** → **Google**.
2. **Enable Sign in with Google** = on.
3. **Authorized Client IDs** must include the **Web client ID**
   `1026671088815-iq0qt119umtkrsn90pib0lefn1kqlasr.apps.googleusercontent.com`.
   The app signs in with a native Google **ID token** whose audience is this web
   client, and Supabase verifies it against this list.
4. Save.

_(This already works for the `.dev` build, so it's likely set — just verify.)_

---

## Phase 5 — Wire it into the build (handled in-repo)

Once `apps/mobile/google-services.json` contains the production package:

1. Upload it to EAS as a secure **file** variable (it's gitignored, so it can't
   ride along in the build archive):
   ```
   eas env:create --name GOOGLE_SERVICES_JSON --type file \
     --value ./google-services.json --visibility sensitive \
     --environment preview --environment production
   ```
2. Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the `preview` and `production`
   `env` blocks in `apps/mobile/eas.json` (the value from the table). This is
   what makes the gate (`googleAuthAvailable()`) show the button.
3. Rebuild:
   ```
   eas build --platform android --profile preview       # test APK
   eas build --platform android --profile production     # Play Store AAB
   ```

`app.config.ts` already conditionally adds the `@react-native-google-signin`
plugin and `googleServicesFile` whenever `GOOGLE_SERVICES_JSON` is present — so
no code changes are needed.

---

## Order of operations

- **To test Google on a preview APK now:** Phase 1 → Phase 4 → Phase 5 (Play
  signing not required for a directly-installed APK).
- **Before the public Play Store launch:** also complete Phase 2 (Play App
  Signing SHA-1) and Phase 3 (publish consent screen), then rebuild the
  production AAB.
