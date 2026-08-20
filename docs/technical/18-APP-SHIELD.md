# 18 — APP SHIELD: blocking other apps until today's practice is done

Implementation plan for shielding user-selected apps (Instagram, TikTok, …) and
lifting the shield only once she has done something in Aura.

Researched 2026-08-20 against Expo SDK 57 / RN 0.86 / iOS deployment target 16.4.
Nothing is built. This is distinct from **17 — APP LOCK**, which puts Face ID in
front of _Aura_; this puts Aura in front of _everything else_.

---

## 1. Verdict

**Technically possible. Organisationally expensive. Cannot be in 1.0.**

The blocker is not code — it is that Apple must grant a
`com.apple.developer.family-controls` **Distribution** entitlement before a build
using it can leave your Mac, and approval is a human review that takes weeks.
You are mid-submission on 1.0. This is a 1.1 or 2.0 feature, and starting the
entitlement request today is the only part that should happen now.

---

## 2. Read this before building it

Aura's own positioning says, in `docs/00`, that this is **not** a habit-tracker
and not a guilt machine. `docs/01 §10` bans urgency and pressure vocabulary. Your
App Store screenshot number 8 currently ends on the line:

> **No streaks. Nothing to break.**

An app blocker is, by construction, a coercive mechanic. It is the opposite of
that line. This does not mean don't build it — plenty of people genuinely want a
door they can lock against themselves, and "I choose this" is different from "the
app punishes me". But it does mean two things:

1. **It must be strictly opt-in, off by default, and easy to turn off.** A
   blocker you cannot escape is the thing that gets one-star reviews and, worse,
   is the thing this brand promised not to be.
2. **The framing has to be hers, not ours.** "Nothing else until you've done
   this" is punishment. "Keep the noise out until you've had your moment" is a
   door she chose to close. That is a copy problem, and copy is a product surface
   here — see `docs/14-CONTENT-VOICE`.

Take that to the founder before the engineering starts. It is a positioning
decision, not a technical one.

---

## 3. How iOS actually does this

Three frameworks, all Swift-only, all iOS 15.1+ (we target 16.4, so fine):

| Framework           | Role                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **FamilyControls**  | Authorization, and `FamilyActivityPicker` — the system UI where she picks apps.           |
| **ManagedSettings** | The shield itself. `ManagedSettingsStore().shield.applications = tokens`.                 |
| **DeviceActivity**  | Schedules that fire even when Aura is not running — how the shield comes _back_ each day. |

The critical privacy design: the picker returns **opaque tokens**
(`ApplicationToken`), not bundle IDs. You never learn which apps she chose. You
can shield them and that is all. This is good — it means shielding adds no new
personal data to our privacy label — but it also means you cannot show her a
list saying "Instagram, TikTok" in your own UI. You show Apple's picker, or you
show a count.

### Three app extensions are mandatory

| Extension                        | Why it exists                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DeviceActivityMonitorExtension` | Runs on schedule outside the app; re-applies the shield each morning.                                              |
| `ShieldConfigurationExtension`   | Draws the blocking screen — this is where Aura's bone/ember world and the orb go, instead of Apple's grey default. |
| `ShieldActionExtension`          | Handles the buttons on that screen ("Open Aura").                                                                  |

Extensions run in separate processes. They cannot see your JS, your MMKV, or
your Zustand stores. **Everything shared crosses an App Group** — a shared
`UserDefaults` suite — and that constraint drives the whole architecture below.

---

## 4. The long pole: the entitlement

`com.apple.developer.family-controls` is not self-serve. You request it from
Apple behind your developer login, they review the use case, and only then can
you distribute.

Two things people get wrong:

- **You need four bundle IDs approved**, not one: `com.aura.manifestdaily` plus
  one per extension. Request them together.
- **Until approval lands you are stuck on local Xcode builds.** No TestFlight, no
  App Store. That alone rules out shipping this alongside 1.0.

Self-restriction apps do get approved — Opal, One Sec, Brick and ScreenZen all
ship on the App Store using exactly this stack — so the precedent is good. Frame
the request as self-directed focus, not parental control.

**Action today: file the request.** It costs an hour and it is the only thing on
the critical path that cannot be compressed later.

---

## 5. Library

`react-native-device-activity` (kingstinct), currently **0.6.1**.
Peer deps `expo >= 52`, `react-native >= 0.76` — we are on 57 / 0.86, compatible.

It wraps all three frameworks, ships the picker, the shield calls, and the
scheduling, and generates the three extensions through
`@kingstinct/expo-apple-targets`.

**That last part matters more than it looks.** `apps/mobile/ios/` is _not tracked
in git_ — zero files under version control; it is `expo prebuild` output. Adding
three app extensions by hand in Xcode would either be destroyed by the next
prebuild or force the repo to go bare. The config-plugin route keeps prebuild as
the source of truth, which is the only sane option here.

Documented rough edges, straight from its README — plan for them:

- The SwiftUI picker "is prone to crashing, especially when browsing larger
  categories".
- Hard cap of **20 simultaneous** device-activity monitors.
- The Screen Time APIs are "very finnicky" — Low Power Mode and stale device
  state cause failures that look like bugs in your code.

---

## 6. Architecture for Aura

### 6.1 The daily cycle

```
04:00  DeviceActivityMonitorExtension fires (intervalDidStart)
       └─ re-applies shield from the App Group selection

       … she opens Instagram → shield screen (our ShieldConfiguration)
          └─ "Open Aura" (ShieldAction) → deep link aura://

       … she plays today's moment / writes gratitude
          └─ Aura writes { unlockedFor: "2026-08-20" } to the App Group
          └─ Aura calls ManagedSettingsStore().clearAllSettings()

       … apps open normally for the rest of the day

04:00  next day — cycle repeats
```

The shield is re-applied by the **extension**, not the app, because the app is
not running at 4am. The shield is lifted by the **app**, at the moment the task
completes, because that is when we know.

### 6.2 What crosses the App Group

`group.com.aura.manifestdaily.shield`, shared `UserDefaults`:

| Key           | Written by                              | Read by                       |
| ------------- | --------------------------------------- | ----------------------------- |
| `selection`   | App (encoded `FamilyActivitySelection`) | Monitor extension             |
| `unlockedFor` | App (`YYYY-MM-DD` on task completion)   | Monitor extension             |
| `enabled`     | App (her toggle)                        | Monitor extension             |
| `shieldCopy`  | App (localised strings)                 | ShieldConfiguration extension |

Nothing sensitive crosses it. No entry text, no memory, no letter. The shield
screen must never quote her own words back at her from behind a lock — that is a
privacy leak onto a screen someone else may be holding.

### 6.3 What counts as "the task"

Product decision, not engineering. The honest options, in order of how well they
fit the app:

1. **Play today's moment** — it is the daily ritual the whole product is built
   around, and it takes ~2 minutes.
2. **Write today's gratitude line** — ten seconds; feels proportionate to
   unlocking a phone.
3. **Both** — strict; risks resentment.

Recommendation: **one gratitude line, or the moment played to completion —
whichever she does first.** It keeps the bargain small and honest, and both feed
the memory, so the shield makes the product better rather than just harder.

Define this as a single predicate in one place:

```ts
// features/shield/completion.ts
export function todaysPracticeDone(state): boolean;
```

so the shield, the analytics and the Settings copy can never disagree about what
"done" means.

---

## 7. Implementation phases

**Phase 0 — unblock the calendar (do now, 1 hour)**

- File the Family Controls Distribution request for all four bundle IDs.
- Get the founder's call on §2 (positioning) and §6.3 (what the task is).

**Phase 1 — spike, behind a flag (2–3 days, after entitlement lands)**

- `npx expo install react-native-device-activity`
- Config plugin: team ID, app group, three targets.
- `npx expo prebuild --clean`, confirm the extensions appear and the app still
  builds and boots. **Regression risk: prebuild touches the whole iOS project;
  re-verify Google sign-in, Apple sign-in, push and background audio.**
- Request authorization, show the picker, shield one app, unshield it. Nothing
  more. Prove the loop on a real device.

**Phase 2 — the daily mechanism (3–5 days)**

- `DeviceActivitySchedule` with a daily interval at her chosen reset hour.
- Monitor extension: on `intervalDidStart`, read `enabled` + `unlockedFor`;
  shield only if enabled and not already satisfied for today.
- App: on task completion, write `unlockedFor` and clear the store.
- App Group plumbing and a typed wrapper over the shared defaults.

**Phase 3 — the shield screen (2–3 days)**

- `ShieldConfiguration`: bone ground, orb, one line in voice, primary button
  "Open Aura". This screen is the whole feature's face — it is what she sees at
  her weakest moment, and Apple's default grey box would undo the brand.
- `ShieldAction`: deep-link into the app, landing on today's moment.

**Phase 4 — Settings, copy, safety (2–3 days)**

- Toggle, app picker entry, reset-hour picker.
- **A visible, always-available off switch.** See §8.
- Copy through `copy/` and the copy lint.

**Phase 5 — tests and review prep (2 days)**

- Per §9, plus review notes explaining the entitlement use.

Realistic total: **two to three weeks of engineering**, gated behind an
approval that may itself take longer.

---

## 8. Failure modes that must be designed for

| Case                                  | Required behaviour                                                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **She wants out**                     | Turning the toggle off must clear the shield **immediately and unconditionally**. No friction, no confirmation gauntlet, no "are you sure" three times. A blocker she cannot escape is a hostage situation and Apple reads it that way too.    |
| Authorization revoked in iOS Settings | Detect on foreground, clear our state, tell her plainly the shield is off.                                                                                                                                                                     |
| She deletes Aura while shielded       | **Verify on device before shipping.** ManagedSettings are owned by the app and should clear on deletion — but if they do not, we have bricked her phone's apps with no way back. This is the single highest-severity unknown in this document. |
| Monitor extension does not fire       | Shield silently never re-applies. Fail _open_, never closed. Log it, do not retry aggressively.                                                                                                                                                |
| Time zone / travel                    | Anchor `unlockedFor` to local calendar day, same as the streak logic already does.                                                                                                                                                             |
| Low Power Mode                        | Documented to break these APIs. Treat missing shields as expected, not as an error to surface.                                                                                                                                                 |
| Device restart                        | Re-assert shield state on next foreground.                                                                                                                                                                                                     |

---

## 9. Testing

Jest can cover the pure logic and nothing else — the frameworks are native and
the extensions are separate processes:

- `todaysPracticeDone()` predicate, including the day-boundary case.
- The App-Group wrapper: encode/decode, missing keys, corrupt values.
- Toggle-off clears state even when the native call throws.

Everything else is device-only, and must be on the checklist:
authorization grant and denial, picker cancel, shield appears, shield screen
renders our design, "Open Aura" deep-links correctly, task completion unshields,
next-day re-shield, toggle-off from a shielded state, **app deletion while
shielded**.

Simulators do not run Screen Time properly. Budget for real hardware.

---

## 10. App Store review

- Entitlement approval is separate from and prior to app review.
- Add review notes explaining that the shield is self-directed, opt-in and
  revocable at any moment, with the exact steps to enable and disable it.
- Provide a demo path — a reviewer who shields their own apps and cannot work
  out how to unshield them will reject, and be annoyed.
- The privacy label does not change: tokens are opaque and nothing about which
  apps she chose ever reaches us. Say that in the notes; it pre-empts a question.

---

## 11. Open questions

1. **Positioning** (§2) — does this belong in Aura at all, or is it a second app?
   The mechanic is coercive and the brand is explicitly not.
2. **What counts as done** (§6.3).
3. **Reset hour** — fixed 04:00, or her arrival time from S11?
4. **Free or premium?** It is the most "gateable" feature yet built, but gating
   a self-control tool behind a paywall is a bad look.
5. **Does deleting the app clear the shield** (§8) — must be answered on device
   before this ships, not after.

---

Related: 17 (app lock — the inverse feature) · 14 §1 (security baseline) ·
docs/00 §"What this app is NOT" · docs/01 §10 (no pressure) ·
docs/14-CONTENT-VOICE (shield copy)
