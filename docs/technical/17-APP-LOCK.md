# 17 — APP LOCK (Face ID / Touch ID / passcode)

R&D for putting a biometric lock in front of the app. Written 2026-08-20 against
Expo SDK 57 / RN 0.86. Nothing here is built yet — this is the decision record
and the plan.

---

## 1. Why this belongs in Aura specifically

Most apps that add a lock are protecting money. This one is protecting something
that is harder to justify losing: the struggle she typed on S10, the people she
named, her gratitude entries, and a letter that says her name out loud.

The product already sells the promise that this is a private place — "What Aura
Knows" is a transparency screen, the Never-Include list is a promise about
generated content, and 14 §3 minimises what leaves the device. A lock is the
missing piece of the same argument: those features control what the app _does_
with her words, and none of them stop the person sitting next to her reading them.

The realistic threat is a shared or handed-over phone: a partner, a parent, a
colleague picking it up unlocked. That is the whole design target.

---

## 2. What a lock is NOT — and the doc must say so

This is a **UI gate, not encryption.** The rows still sit in plain MMKV and in
Supabase, and the session token still sits in the keychain. Anyone with the
device passcode, a backup, or a jailbreak reads all of it whether or not the app
locks.

iOS Data Protection already encrypts app storage at rest whenever the user has a
device passcode set. Our lock adds nothing to that. It adds one thing only: it
stops a person who is already holding the _unlocked_ phone from reading her
words.

**Do not market it as security.** The copy should say what it does — "Ask for
Face ID before opening" — never "your entries are encrypted", which would be a
lie and, given 01 §10, exactly the kind of lie this product does not tell.

---

## 3. The library

`expo-local-authentication`. **Not currently installed** — add with
`npx expo install expo-local-authentication` so the SDK-57-correct version is
resolved rather than pinned by hand.

API surface we need:

| Call                                  | Returns                | Used for                                                  |
| ------------------------------------- | ---------------------- | --------------------------------------------------------- |
| `hasHardwareAsync()`                  | `boolean`              | Is there a sensor at all                                  |
| `isEnrolledAsync()`                   | `boolean`              | Has she actually set up Face ID / a fingerprint           |
| `supportedAuthenticationTypesAsync()` | `AuthenticationType[]` | Say "Face ID" vs "Touch ID" in copy                       |
| `getEnrolledLevelAsync()`             | `SecurityLevel`        | `NONE` / `SECRET` / `BIOMETRIC_WEAK` / `BIOMETRIC_STRONG` |
| `authenticateAsync(opts)`             | `{ success, error? }`  | The prompt itself                                         |

`authenticateAsync` options that matter to us:

- `promptMessage` — shown next to the Face ID sheet. In voice, not "Authenticate".
- `fallbackLabel` (iOS) — the passcode button's label.
- `disableDeviceFallback` — **leave false.** With it true, a failed/absent
  biometric has no way through and she is locked out of her own letters. The
  device passcode fallback is the escape hatch that keeps this feature humane.
- `cancelLabel` — she can dismiss; we then hold on the lock screen with a
  "Try again" affordance rather than dumping her into the app.

Config plugin sets the Info.plist string:

```js
[
  'expo-local-authentication',
  { faceIDPermission: 'Aura uses Face ID so only you can open your letters.' },
];
```

`NSFaceIDUsageDescription` is **mandatory** — an app that calls Face ID without it
crashes on first use. Face ID also does not work in Expo Go; this needs the dev
build, which we already use.

---

## 4. The two hard problems, both specific to this app

### 4.1 Audio must survive the lock

`app.config.ts` declares `UIBackgroundModes: ['audio']`, and
`usePlayback.ts` is explicit: the moment player pauses on background, but **the
Letter runs its own session and is deliberately left playing** so a locked screen
mid-letter keeps going. That is the wow moment's design.

So the lock gate must be a **render-layer gate only**. It must never pause a
player, tear down audio, or unmount the player tree. Coming back to a locked app
with the Letter still speaking is correct behaviour: the audio continues, and the
lock covers the words until she authenticates.

This rules out the naive implementation (`if (locked) return <LockScreen/>` in
place of the app), because unmounting the tree kills the player. The gate must
**overlay**, with the app still mounted underneath.

### 4.2 Re-locking must not be hostile

Locking on every single backgrounding makes the app unusable: she taps a
notification, glances at a message, comes back, Face ID again. The standard fix
is a grace period.

**Proposal: lock after 60s in the background, immediately on nothing else.**
Under 60s, resume without a prompt. This is the same shape Signal and 1Password
use, and it is short enough that a handed-over phone is still protected.

A subtlety: RN's `AppState` reports `inactive` on iOS when the app switcher opens
or a call arrives, _before_ `background`. Start the grace timer from `background`
only — starting it on `inactive` would re-lock her for pulling down
Notification Centre.

---

## 5. Architecture

### 5.1 Where the gate mounts

Not inside `BootGate` — that holds on a themed blank view until the profile
resolves, and a lock nested under it would flash the app before covering it.
Not replacing the `Stack` either, per §4.1.

**Mount it as the last child of `GestureHandlerRootView`,** an
absolutely-positioned full-bleed overlay above the `Stack` and above
`BottomSheetModalProvider`. That is the only position that covers bottom sheets
and `fullScreenModal` routes (the Letter, the player, the paywall) — all of
which would otherwise render over a lock screen mounted lower in the tree.

```
GestureHandlerRootView
└── SafeAreaProvider
    └── ThemeProvider
        └── AppErrorBoundary
            └── MotionProvider
                └── QueryClientProvider
                    └── BottomSheetModalProvider
                        ├── BootGate → Stack        ← app, stays mounted
                        └── LockOverlay             ← absolute, zIndex above all
```

### 5.2 State

A small Zustand store beside `appState`, per 05 §2 (client state in Zustand,
small stores):

```ts
type LockState = 'unlocked' | 'locked' | 'prompting';
```

- `enabled: boolean` — her preference.
- `state: LockState`.
- `backgroundedAt: number | null` — drives the grace period.

`prompting` matters: without it, an `AppState` change while the Face ID sheet is
already up re-fires `authenticateAsync`, and iOS rejects the second call — the
prompt vanishes and she is stuck on a lock screen with no way forward.

### 5.3 Storage

The **enabled flag goes in MMKV** (`STORAGE_KEYS.appLockEnabled`), not
SecureStore. It is a preference, not a secret — there is no secret here to keep,
because the biometric check is performed by iOS and we only ever receive a
boolean. Putting it in SecureStore would imply a confidentiality this feature
does not have.

Note the consequence: MMKV is cleared by `kv.clearAll()` in the deletion runbook
(14 §6), which is correct — deleting the account should not leave a lock
preference behind.

---

## 6. State machine

| From        | Event                          | To                          | Notes                                     |
| ----------- | ------------------------------ | --------------------------- | ----------------------------------------- |
| `unlocked`  | `AppState → background`        | `unlocked`                  | Record `backgroundedAt`. Do not lock yet. |
| `unlocked`  | `AppState → active`, gap ≥ 60s | `locked`                    | Then immediately `prompting`.             |
| `unlocked`  | `AppState → active`, gap < 60s | `unlocked`                  | No prompt.                                |
| `unlocked`  | cold launch, `enabled`         | `locked`                    | Always prompt on a fresh launch.          |
| `locked`    | prompt shown                   | `prompting`                 | Guard against double-fire.                |
| `prompting` | `success`                      | `unlocked`                  | Clear `backgroundedAt`.                   |
| `prompting` | `cancel` / `error`             | `locked`                    | Stay covered, offer "Try again".          |
| any         | sign-out / account deleted     | `unlocked`, `enabled=false` | No lock over a signed-out app.            |

---

## 7. Edge cases

| Case                                  | Behaviour                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No sensor (`hasHardwareAsync` false)  | Hide the Settings row entirely. Never show a toggle that cannot work.                                                                             |
| Sensor present, nothing enrolled      | Show the row, disabled, with a line explaining she needs to set up Face ID in iOS Settings first.                                                 |
| She removes Face ID after enabling    | `authenticateAsync` falls back to device passcode. Still works. Do not silently disable.                                                          |
| Biometric lockout (too many failures) | iOS forces passcode. This is why `disableDeviceFallback` stays false.                                                                             |
| Device has no passcode at all         | Then there is no fallback and no Data Protection either. Offer the toggle, but the lock is decorative — acceptable, and not worth special-casing. |
| Notification tap into a locked app    | Route as normal underneath; the overlay covers it. Unlock reveals the right screen. `useNotificationRouting` needs no change.                     |
| Letter playing when locked            | Audio continues (§4.1). The overlay hides the karaoke text only.                                                                                  |
| App switcher snapshot                 | **Separate problem — see §8.**                                                                                                                    |

---

## 8. The app-switcher snapshot (do this at the same time)

iOS screenshots the app when it backgrounds, and that image shows in the app
switcher — visible to anyone thumbing through open apps, lock or no lock. A lock
that leaves her gratitude entry legible in the switcher is theatre.

Fix: render an opaque cover on `AppState === 'inactive'` (which fires _before_
the snapshot is taken), not `background`. The cover should be the bone ground
plus the orb — it will read as the splash rather than as a redaction.

This is cheap and it is arguably more valuable than the lock itself. It should
ship in the same change.

---

## 9. Settings UI

One row in the first Settings group (how the app behaves day to day), beside the
ambient-sound toggle:

- Title: **"Lock Aura"** — not "App Lock", not "Security".
- Subtitle when off: "Ask for Face ID before opening."
- Subtitle when on: "Face ID is required to open Aura."
- A `Switch`, matching `ambientEnabled`'s existing pattern.

Copy goes in `copy/settings.ts` and must pass the copy lint. The label should name
the actual hardware — `supportedAuthenticationTypesAsync()` tells us whether to
say Face ID or Touch ID, and saying the wrong one reads as an app that does not
know what phone it is on.

**Turning it ON should require a successful `authenticateAsync` first.** Proving
it works before promising it does is the honest order, and it catches a broken or
unenrolled sensor at the moment she opts in rather than the next morning.

---

## 10. Testing

Jest cannot exercise Face ID, so mock the module and test the logic that actually
holds the bugs:

- The grace period: 59s does not lock, 61s does.
- `inactive` does not start the grace timer; `background` does.
- The `prompting` guard: two rapid `active` events fire `authenticateAsync` once.
- Sign-out clears `enabled`.
- The row is hidden when `hasHardwareAsync()` is false.
- **The overlay does not unmount the tree** — assert the player is still mounted
  while locked. This is the regression that would silently kill the Letter.

Device testing is mandatory for the rest: the simulator's "Matching/Non-matching
Face" menu covers success and failure, but not lockout or a real cold launch.

---

## 11. Analytics

Per 13, capture `app_lock_enabled` / `app_lock_disabled` only. **Do not** capture
unlock attempts, successes or failures — a stream of unlock events is a log of
when she opens a manifestation app, which is exactly the sensitive-tier data 14
§4 says never leaves the device.

---

## 12. App Store implications

- `NSFaceIDUsageDescription` is required, and its wording is reviewed.
- No new App Privacy declaration: biometric data never reaches us. iOS returns a
  boolean; we store nothing. The privacy label does not change.
- Update the Privacy Policy anyway to state that plainly — it is the kind of
  sentence that earns trust for one line of effort.

---

## 13. Scope

**V1 (ship together):**

1. `expo-local-authentication` + config plugin
2. Lock store, overlay, grace period
3. The `inactive` snapshot cover (§8)
4. Settings row with the prove-it-works opt-in
5. Tests per §10

**Deliberately later:**

- A custom in-app PIN. It means storing and verifying a secret ourselves, which
  is real cryptographic responsibility, and the device passcode fallback already
  covers the same ground.
- Per-screen locks ("lock only Gratitude"). More surface, more edge cases, and
  the whole app is sensitive anyway.
- Android. `expo-local-authentication` covers it, but Android's biometric
  classes (`BIOMETRIC_WEAK` vs `STRONG`) need their own decision, and V1 is iOS.

---

## 14. Open questions

1. **60 seconds** — a guess from what comparable apps do. Worth a founder call.
2. **Should the lock ever cover the Letter's first play?** Locking a user out of
   the wow moment mid-listen because they took a call is the worst possible first
   impression. Consider suppressing the lock while the Letter session is active.
3. **Default off**, presumably — but there is an argument for prompting once,
   after the first gratitude entry, when the value is obvious.

---

Related: 14 §1 (security baseline) · 14 §4 (sensitive-tier enforcement) ·
10 (audio session) · 05 §2 (state rules) · product 18 (privacy & safety)
