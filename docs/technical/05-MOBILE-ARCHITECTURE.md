# 05 — MOBILE ARCHITECTURE (Expo React Native)

_Implements product docs 11 (IA), 12 (design system), 13 (motion & haptics). Navigation detail → 06. Stack: Expo (dev client + EAS), Expo Router, TanStack Query, Zustand._

---

## 1. Foundation

- **Expo SDK** (latest stable at Phase 0), custom dev client (`expo-dev-client`) — required for RevenueCat, Skia, MMKV native modules. EAS Build profiles: `development`, `staging`, `production` (16).
- **TypeScript strict**; path aliases `@/features/*`, `@/components/*` etc.
- **New Architecture enabled** (default on current Expo; Reanimated + Skia benefit directly).
- **Build targets: iOS + Android.** Superseded 2026-07-20 — the original line read "iOS-only target at V1 (product doc 05); no Android build config until V3." The App Store is still the V1 **launch** target and the only one with a submission checklist (16); Android now has real build config so a dev build on Android hardware is reproducible rather than an uncommitted local edit.
  - Android is **not shippable yet**, and both blockers are founder-side, not code:
    1. **Push is inert.** `expo-notifications` needs FCM credentials (`google-services.json`, wired via `GOOGLE_SERVICES_JSON`). No Firebase project exists. The app runs; notifications do not arrive (11 §2).
    2. **Billing is inert.** RevenueCat issues a key per store and the iOS key is rejected by the Android SDK. `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` is unset, so Android degrades to free-tier — the documented behaviour for a build with no RC project (12 §2).
  - Two platform differences are behavioural, not config:
    - **Sign in with Apple is iOS-only.** `appleAuthAvailable()` returns false on Android, so the claim sheet offers the magic link alone. That path is complete on both platforms, and claiming never gates entitlement (03 §2.2) — so this is a narrower claim UI, not a broken one.
    - **The microphone permission is actively suppressed.** `expo-audio`'s `recordAudioAndroid` defaults to `true`; left alone it would put `RECORD_AUDIO` in the manifest of an app that never records, and Google Play prints manifest permissions on the store listing _before_ install. Suppressed at the plugin and re-blocked via `android.blockedPermissions` (product 02, 18).

## 2. State management

| Kind             | Tool                                                         | Examples                                                                    |
| ---------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Server state     | **TanStack Query** over Supabase client + backend api client | profile, moments list, memory items, gratitude history, job polling         |
| Client state     | **Zustand** (small stores)                                   | player state (track, position, minimized), onboarding draft, app boot state |
| Persistent local | **MMKV**                                                     | onboarding draft (resume — product 07), audio cache index, "seen" flags     |
| Entitlement      | RevenueCat SDK (`useEntitlement` hook wraps listener)        | gating everywhere                                                           |

Rules: no server data in Zustand; TanStack Query keys namespaced per feature (`['moments','today']`); mutations optimistic where UX demands instant feel (gratitude save, favorite) with rollback + silent retry queue.

## 3. Offline strategy (product docs 07, 09)

- **Gratitude is local-first:** write to MMKV immediately (dot fills, haptic ticks), background sync to Supabase; conflict = server wins by `entry_date` uniqueness, local merged if server empty. "Saved locally, syncs silently" (product 09 states).
- **Onboarding offline:** answers cached in draft store; generation queued with honest in-voice state ("I'll have it ready the moment we're back online"); resume on reconnect.
- **Audio:** today's moment pre-fetched on app open/notification; favorites + Letter cached permanently (10 §6). Playback of cached audio fully offline.
- **Read paths:** TanStack Query cache persisted (MMKV persister) → last-known Home renders offline with countdown + cached moment.

## 4. Design system implementation (product doc 12 — Aura Design v3 "Ember & Bone")

`src/theme/` exports typed tokens; **no raw hex/size literals in feature code** (lint rule). `palette.ts` holds the raw hexes (imported only by tokens), `tokens.ts` the semantic mapping per scheme plus spacing/radii/shadows/icon sizes/durations, `typography.ts` the fonts and type scale.

```ts
// tokens (from product doc 12, v3 "Ember & Bone")
colors: bone #ECE9DF (bg) · white #FFFFFF (surfaces) · ink #1B1810 (text, CTA, FAB) ·
        inkBody #4A4536 · inkMuted #6F6A58 · olive #8A8265 (labels, selected chips) ·
        oliveSoft #DAD5BE (borders) · ember #F2A96F→#E2682F (voice & audio ONLY) ·
        emberDeep #C9531F (links, progress) · blush #F6D3DF · parchment #F4EBD6 (affirmations) ·
        rust #9E2B12 (errors only) · cream #F5F2E8 (on-ink) · dark bases #171410/#242019
typography: serif Newsreader 500 (display 34/40 · title 24/30 · voice italic 22/38)
            sans Figtree 400/500/600/700 (body 15/24 · caption 13/19 · headline 16/22)
            label (uppercase, letterspaced, Figtree 600 11/15)
spacing: 4pt grid — margins & card padding 20, gutters 12, section gaps 32, hero 56
radii: chip 14 · field 16 · card 22 · pill/FAB round · shadow 0 12 32 ink/10
```

- **Dark mode from day one:** tokens are semantic (`bg.base`, `text.primary`, `surface.card`…) resolved by scheme; the dark scheme is the same warm world after sundown, derived in `tokens.ts`.
- **Dynamic Type:** all text uses scaled sizes (`useWindowDimensions` + `PixelRatio.getFontScale` clamps for serif surfaces); chips reflow to lists at accessibility sizes (component-level `fontScale > 1.3` breakpoint).
- Core components (Phase 1): `Screen` (gradient bg), `Card` (solid/glassy), `PillButton`, `TextButton`, `Chip`, `SelectCard`, `Input`, `Sheet` (detents wrapper), `TabBar` (floating pill), `Label`, `SerifDisplay`, `CountdownChip`, `WeekDots`, `Skeleton`, `EmptyState`, `Orb`.

## 5. The Orb (signature element)

- **Skia** (`@shopify/react-native-skia`) radial-gradient sphere + noise shimmer; driven by Reanimated shared values.
- States: `idle` (4s breath cycle: scale 1.0↔1.04) · `listening` (shimmer) · `generating` (3s cycle + inner glow) · `speaking` (amplitude-reactive glow — fed by player's metering callback, 10 §5).
- Runs entirely on UI thread; CPU cap validated on mid-tier device (iPhone 12) in Phase 1 DoD.
- Reduce Motion: breath amplitude → 0, crossfade state changes only.

## 6. Motion & haptics (product doc 13)

- **Reanimated** for all animation (native driver, JS-thread-free); screen transitions via Expo Router/native-stack defaults (350ms push, interactive back-swipe).
- Shared choreography helpers: `fadeRise(300)` (letter lines, reflections), `chipSelect(150, scale .97)`, `sheetSpring`, `crossfade(400)`.
- **Haptics** via `expo-haptics`, wrapped in `src/theme/haptics.ts` implementing the full product-13 table (`light`, `softTick`, `success`, `mediumOnce`) with global guards: respects system setting, min 500ms between fires, ≤2 per screen (dev-mode warning if exceeded), **never on errors or paywall**.
- Letter world runs its own timing scale (~1.2×) via a `MotionContext`.

## 7. Audio playback (detail → 10)

`expo-audio` player wrapped in `src/lib/audio/PlayerService` (single instance, Zustand-mirrored state): play/pause, scrub, ±15s, rate (1.0/1.25/1.5), background audio + lock-screen controls (`staysActiveInBackground`, remote-control events), interruption handling (calls pause; resumes on `shouldResume`), silent-switch pre-check on the Letter (product 08 §4). Karaoke sync: position events at 60Hz drive current-word index into `word_timings` (binary search on scroll-driven shared value).

## 8. Error & loading conventions (product docs 13, 14)

- Never spinners: loading = orb + one in-voice line (from `src/copy/loading.ts`), or Sand skeleton shimmer for lists.
- Errors: crossfade to in-voice retry copy; error taxonomy mapped from the API envelope (07 §5) to copy keys; codes never shown. Sentry captures the technical detail.
- All companion copy lives in `src/copy/*.ts` typed catalogs — single audit surface for the banned-phrase test (15 §5).

## 9. Boot sequence

```
cold start → splash (static orb)
→ load session (secure store) | signInAnonymously
→ hydrate MMKV stores + query cache
→ RevenueCat logIn(userId) · PostHog identify · Sentry setUser (id only)
→ route: !onboarding_completed_at → (onboarding) : (tabs)/home
→ prefetch: today's moment (+audio), affirmation state, gratitude today
```

Target cold start → interactive Home < 2s on iPhone 12; deep links (notification) bypass Home → player (06 §5).

## 10. Quality bars (release-blocking, product 12/13)

60fps on all transitions and the orb (verified with Perf monitor on device) · audio start <300ms pre-buffered · VoiceOver complete on every screen · Dynamic Type reflow verified at largest accessibility size · Reduce Motion path on every animation · dark mode on every screen.
